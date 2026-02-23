<?php

namespace Packages\Monitoring\Services;

use App\Models\Alert;
use App\Models\BestPrice;
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
        $monster = $monitor->monster;

        $current = BestPrice::query()
            ->where('monster_id', $monster->id)
            ->where('currency', $snapshot->currency)
            ->first();

        $isImprovement = $current !== null
            && $snapshot->effective_total_cents < $current->effective_total_cents;

        BestPrice::query()->updateOrCreate(
            [
                'monster_id' => $monster->id,
                'currency' => $snapshot->currency,
            ],
            [
                'snapshot_id' => $snapshot->id,
                'effective_total_cents' => $snapshot->effective_total_cents,
                'computed_at' => now(),
            ],
        );

        if ($isImprovement) {
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

    private function formatCents(int $cents, string $currency): string
    {
        return sprintf('%s %0.2f', $currency, $cents / 100);
    }
}
