<?php

namespace Packages\Contributions\Services;

use App\Models\ContributorAlert;
use App\Models\Monitor;
use App\Models\MonsterFollow;
use App\Models\PriceSnapshot;
use Illuminate\Database\Eloquent\Builder;

class ContributorAlertService
{
    private const PRICE_DROP_ALERT_TYPE = 'price_drop';

    private const ALERT_COOLDOWN_HOURS = 6;

    public function handleSnapshot(PriceSnapshot $snapshot, Monitor $monitor): void
    {
        if (! $monitor->canRunScheduledChecks()) {
            return;
        }

        if ($snapshot->status === 'failed' || $snapshot->effective_total_cents === null) {
            return;
        }

        $snapshot->loadMissing('monitor.monster', 'monitor.site');

        $currency = (string) ($snapshot->currency ?: Monitor::DEFAULT_CURRENCY);
        if ($currency !== Monitor::DEFAULT_CURRENCY) {
            return;
        }

        $previousSnapshotByTotal = $this->previousBestSnapshotByTotalBeforeSnapshot(
            (int) $monitor->monster_id,
            $currency,
            $snapshot,
        );
        $previousBestPerCanCents = $this->previousBestPerCanBeforeSnapshot(
            (int) $monitor->monster_id,
            $currency,
            $snapshot,
        );
        $currentPerCanCents = $this->resolvePerCanCentsFromSnapshot($snapshot);
        $isFirstSuccessfulSnapshotForMonitor = ! $this->monitorHasSuccessfulSnapshotBefore(
            (int) $monitor->id,
            $currency,
            $snapshot,
        );

        $hasTotalDrop = $previousSnapshotByTotal !== null
            && $previousSnapshotByTotal->effective_total_cents !== null
            && $snapshot->effective_total_cents < $previousSnapshotByTotal->effective_total_cents;

        $hasPerCanDropFromNewMonitor = ! $hasTotalDrop
            && $isFirstSuccessfulSnapshotForMonitor
            && $currentPerCanCents !== null
            && $previousBestPerCanCents !== null
            && $currentPerCanCents < $previousBestPerCanCents;

        if (! $hasTotalDrop && ! $hasPerCanDropFromNewMonitor) {
            return;
        }

        $eligibleFollows = MonsterFollow::query()
            ->where('monster_id', $monitor->monster_id)
            ->where('currency', $currency)
            ->where(function ($query): void {
                $query->whereNull('last_alerted_at')
                    ->orWhere('last_alerted_at', '<=', now()->subHours(self::ALERT_COOLDOWN_HOURS));
            })
            ->get();

        if ($eligibleFollows->isEmpty()) {
            return;
        }

        $monsterName = (string) ($monitor->monster?->name ?: 'Monster');
        $siteName = (string) ($monitor->site?->name ?: 'Unknown store');

        if ($hasTotalDrop) {
            $title = sprintf(
                'Price drop: %s now %s',
                $monsterName,
                $this->formatCents((int) $snapshot->effective_total_cents, $currency),
            );
            $body = sprintf(
                '%s dropped from %s to %s on %s.',
                $monsterName,
                $this->formatCents((int) $previousSnapshotByTotal->effective_total_cents, $currency),
                $this->formatCents((int) $snapshot->effective_total_cents, $currency),
                $siteName,
            );
        } else {
            $title = sprintf(
                'Price drop: %s now %s per can',
                $monsterName,
                $this->formatCents((int) $currentPerCanCents, $currency),
            );
            $body = sprintf(
                '%s dropped from %s per can to %s per can on %s.',
                $monsterName,
                $this->formatCents((int) $previousBestPerCanCents, $currency),
                $this->formatCents((int) $currentPerCanCents, $currency),
                $siteName,
            );
        }

        $createdForFollowIds = [];
        foreach ($eligibleFollows as $follow) {
            $alert = ContributorAlert::query()->firstOrCreate(
                [
                    'user_id' => (int) $follow->user_id,
                    'price_snapshot_id' => $snapshot->id,
                    'type' => self::PRICE_DROP_ALERT_TYPE,
                ],
                [
                    'monster_id' => $monitor->monster_id,
                    'monitor_id' => $monitor->id,
                    'currency' => $currency,
                    'effective_total_cents' => $snapshot->effective_total_cents,
                    'title' => $title,
                    'body' => $body,
                ],
            );

            if ($alert->wasRecentlyCreated) {
                $createdForFollowIds[] = (int) $follow->id;
            }
        }

        if ($createdForFollowIds !== []) {
            MonsterFollow::query()
                ->whereIn('id', $createdForFollowIds)
                ->update([
                    'last_alerted_at' => now(),
                ]);
        }
    }

    private function previousBestSnapshotByTotalBeforeSnapshot(
        int $monsterId,
        string $currency,
        PriceSnapshot $snapshot,
    ): ?PriceSnapshot {
        return PriceSnapshot::query()
            ->select('price_snapshots.*')
            ->join('monitors', 'monitors.id', '=', 'price_snapshots.monitor_id')
            ->where('monitors.monster_id', $monsterId)
            ->where('monitors.submission_status', Monitor::STATUS_APPROVED)
            ->where('monitors.active', true)
            ->where('price_snapshots.currency', $currency)
            ->whereNotNull('price_snapshots.effective_total_cents')
            ->where('price_snapshots.status', '!=', 'failed')
            ->where(function (Builder $query) use ($snapshot): void {
                $this->applyBeforeSnapshotConstraint(
                    $query,
                    $snapshot,
                    'price_snapshots.id',
                    'price_snapshots.checked_at',
                );
            })
            ->orderBy('price_snapshots.effective_total_cents')
            ->orderByDesc('price_snapshots.checked_at')
            ->orderByDesc('price_snapshots.id')
            ->first();
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
            ->whereNotNull('price_snapshots.effective_total_cents')
            ->where('price_snapshots.status', '!=', 'failed')
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
