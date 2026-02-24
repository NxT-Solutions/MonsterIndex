<?php

namespace Packages\Monitoring\Services;

use App\Models\Alert;
use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\PriceSnapshot;
use Illuminate\Database\Eloquent\Builder;

class BestPriceProjector
{
    public function projectFromSnapshot(PriceSnapshot $snapshot): void
    {
        if ($snapshot->status === 'failed' || $snapshot->effective_total_cents === null) {
            return;
        }

        $snapshot->loadMissing('monitor.monster', 'monitor.site');

        $monitor = $snapshot->monitor;
        if (! $monitor || $monitor->submission_status !== Monitor::STATUS_APPROVED || ! $monitor->active) {
            return;
        }

        $monster = $monitor->monster;
        if (! $monster) {
            return;
        }

        $snapshotCurrency = (string) ($snapshot->currency ?: Monitor::DEFAULT_CURRENCY);
        $currentPerCanCents = $this->resolvePerCanCentsFromSnapshot($snapshot);
        $previousBestPerCanCents = $this->previousBestPerCanBeforeSnapshot(
            (int) $monster->id,
            $snapshotCurrency,
            $snapshot,
        );
        $isFirstSuccessfulSnapshotForMonitor = ! $this->monitorHasSuccessfulSnapshotBefore(
            (int) $monitor->id,
            $snapshotCurrency,
            $snapshot,
        );

        $previous = BestPrice::query()
            ->where('monster_id', $monster->id)
            ->where('currency', $snapshotCurrency)
            ->first();

        $current = $this->recomputeForMonsterCurrency($monster->id, $snapshotCurrency);

        $hasNewBestTotal = $previous !== null
            && $current !== null
            && $current->snapshot_id === $snapshot->id
            && $current->effective_total_cents < $previous->effective_total_cents;

        $hasNewBestPerCanFromNewMonitor = ! $hasNewBestTotal
            && $isFirstSuccessfulSnapshotForMonitor
            && $currentPerCanCents !== null
            && $previousBestPerCanCents !== null
            && $currentPerCanCents < $previousBestPerCanCents;

        if (! $hasNewBestTotal && ! $hasNewBestPerCanFromNewMonitor) {
            return;
        }

        $siteName = (string) ($monitor->site?->name ?: 'Unknown store');

        if ($hasNewBestTotal) {
            Alert::query()->create([
                'monster_id' => $monster->id,
                'monitor_id' => $monitor->id,
                'type' => 'new_best_price',
                'title' => sprintf('New best price for %s', $monster->name),
                'body' => sprintf(
                    '%s now has a new best total price of %s at %s.',
                    $monster->name,
                    $this->formatCents($snapshot->effective_total_cents, $snapshotCurrency),
                    $siteName,
                ),
            ]);

            return;
        }

        Alert::query()->create([
            'monster_id' => $monster->id,
            'monitor_id' => $monitor->id,
            'type' => 'new_best_price',
            'title' => sprintf('New best per-can price for %s', $monster->name),
            'body' => sprintf(
                '%s now has a new best per-can price of %s (previous %s) at %s.',
                $monster->name,
                $this->formatCents($currentPerCanCents, $snapshotCurrency),
                $this->formatCents($previousBestPerCanCents, $snapshotCurrency),
                $siteName,
            ),
        ]);
    }

    public function recomputeForMonsterCurrency(int $monsterId, string $currency): ?BestPrice
    {
        $bestSnapshot = PriceSnapshot::query()
            ->select('price_snapshots.*')
            ->join('monitors', 'monitors.id', '=', 'price_snapshots.monitor_id')
            ->where('monitors.monster_id', $monsterId)
            ->where('monitors.submission_status', Monitor::STATUS_APPROVED)
            ->where('monitors.active', true)
            ->where('price_snapshots.currency', $currency)
            ->where('price_snapshots.status', '!=', 'failed')
            ->whereNotNull('price_snapshots.effective_total_cents')
            ->whereRaw(
                <<<'SQL'
price_snapshots.id = (
    select latest.id
    from price_snapshots as latest
    where latest.monitor_id = monitors.id
      and latest.currency = ?
      and latest.status != ?
      and latest.effective_total_cents is not null
    order by latest.checked_at desc, latest.id desc
    limit 1
)
SQL,
                [$currency, 'failed'],
            )
            ->orderByRaw($this->perCanOrderExpression().' asc')
            ->orderBy('price_snapshots.effective_total_cents')
            ->orderByDesc('price_snapshots.checked_at')
            ->orderByDesc('price_snapshots.id')
            ->first();

        if (! $bestSnapshot) {
            BestPrice::query()
                ->where('monster_id', $monsterId)
                ->where('currency', $currency)
                ->delete();

            return null;
        }

        return BestPrice::query()->updateOrCreate(
            [
                'monster_id' => $monsterId,
                'currency' => $currency,
            ],
            [
                'snapshot_id' => $bestSnapshot->id,
                'effective_total_cents' => (int) $bestSnapshot->effective_total_cents,
                'computed_at' => now(),
            ],
        );
    }

    private function previousBestPerCanBeforeSnapshot(
        int $monsterId,
        string $currency,
        PriceSnapshot $snapshot,
    ): ?int {
        $bestPerCanSnapshot = PriceSnapshot::query()
            ->select('price_snapshots.*')
            ->join('monitors', 'monitors.id', '=', 'price_snapshots.monitor_id')
            ->where('monitors.monster_id', $monsterId)
            ->where('monitors.submission_status', Monitor::STATUS_APPROVED)
            ->where('monitors.active', true)
            ->where('price_snapshots.currency', $currency)
            ->where('price_snapshots.status', '!=', 'failed')
            ->whereNotNull('price_snapshots.effective_total_cents')
            ->where(function (Builder $query) use ($snapshot): void {
                $this->applyBeforeSnapshotConstraint(
                    $query,
                    $snapshot,
                    'price_snapshots.id',
                    'price_snapshots.checked_at',
                );
            })
            ->orderByRaw($this->perCanOrderExpression().' asc')
            ->orderBy('price_snapshots.effective_total_cents')
            ->orderByDesc('price_snapshots.checked_at')
            ->orderByDesc('price_snapshots.id')
            ->first();

        if (! $bestPerCanSnapshot) {
            return null;
        }

        return $this->resolvePerCanCentsFromSnapshot($bestPerCanSnapshot);
    }

    private function monitorHasSuccessfulSnapshotBefore(
        int $monitorId,
        string $currency,
        PriceSnapshot $snapshot,
    ): bool {
        return PriceSnapshot::query()
            ->where('monitor_id', $monitorId)
            ->where('currency', $currency)
            ->where('status', '!=', 'failed')
            ->whereNotNull('effective_total_cents')
            ->where(function (Builder $query) use ($snapshot): void {
                $this->applyBeforeSnapshotConstraint($query, $snapshot, 'id', 'checked_at');
            })
            ->exists();
    }

    private function applyBeforeSnapshotConstraint(
        Builder $query,
        PriceSnapshot $snapshot,
        string $idColumn,
        string $checkedAtColumn,
    ): void {
        if ($snapshot->checked_at === null) {
            $query->where($idColumn, '<', $snapshot->id);

            return;
        }

        $query->where($checkedAtColumn, '<', $snapshot->checked_at)
            ->orWhere(function (Builder $inner) use ($snapshot, $idColumn, $checkedAtColumn): void {
                $inner->where($checkedAtColumn, '=', $snapshot->checked_at)
                    ->where($idColumn, '<', $snapshot->id);
            });
    }

    private function resolvePerCanCentsFromSnapshot(PriceSnapshot $snapshot): ?int
    {
        if ($snapshot->effective_total_cents === null) {
            return null;
        }

        if ($snapshot->price_per_can_cents !== null) {
            return (int) $snapshot->price_per_can_cents;
        }

        $canCount = (int) ($snapshot->can_count ?? 0);
        if ($canCount > 0) {
            return (int) round($snapshot->effective_total_cents / $canCount);
        }

        return (int) $snapshot->effective_total_cents;
    }

    private function perCanOrderExpression(): string
    {
        return 'COALESCE(price_snapshots.price_per_can_cents, CASE WHEN price_snapshots.can_count IS NOT NULL AND price_snapshots.can_count > 0 THEN ROUND(price_snapshots.effective_total_cents * 1.0 / price_snapshots.can_count) ELSE price_snapshots.effective_total_cents END)';
    }

    private function formatCents(int $cents, string $currency): string
    {
        return sprintf('%s %0.2f', $currency, $cents / 100);
    }
}
