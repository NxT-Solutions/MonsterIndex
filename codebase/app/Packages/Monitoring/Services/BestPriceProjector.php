<?php

namespace Packages\Monitoring\Services;

use App\Models\Alert;
use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\PriceSnapshot;

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

        $previous = BestPrice::query()
            ->where('monster_id', $monster->id)
            ->where('currency', $snapshot->currency)
            ->first();

        $current = $this->recomputeForMonsterCurrency($monster->id, $snapshot->currency);
        if (
            $previous !== null
            && $current !== null
            && $current->snapshot_id === $snapshot->id
            && $current->effective_total_cents < $previous->effective_total_cents
        ) {
            Alert::query()->create([
                'monster_id' => $monster->id,
                'monitor_id' => $monitor->id,
                'type' => 'new_best_price',
                'title' => sprintf('New best price for %s', $monster->name),
                'body' => sprintf(
                    '%s now has a new best total price of %s at %s.',
                    $monster->name,
                    $this->formatCents($snapshot->effective_total_cents, $snapshot->currency),
                    $monitor->site->name,
                ),
            ]);
        }
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
            ->orderBy('price_snapshots.effective_total_cents')
            ->orderByDesc('price_snapshots.checked_at')
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

    private function formatCents(int $cents, string $currency): string
    {
        return sprintf('%s %0.2f', $currency, $cents / 100);
    }
}
