<?php

use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\PriceSnapshot;
use Packages\Monitoring\Services\BestPriceProjector;

it('creates alert when a lower best price is found', function () {
    $monitor = Monitor::factory()->create();

    $oldSnapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'effective_total_cents' => 2500,
        'currency' => 'USD',
        'status' => 'ok',
    ]);

    BestPrice::query()->create([
        'monster_id' => $monitor->monster_id,
        'snapshot_id' => $oldSnapshot->id,
        'effective_total_cents' => 2500,
        'currency' => 'USD',
        'computed_at' => now(),
    ]);

    $newSnapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'effective_total_cents' => 1999,
        'currency' => 'USD',
        'status' => 'ok',
    ]);

    app(BestPriceProjector::class)->projectFromSnapshot($newSnapshot);

    $this->assertDatabaseHas('best_prices', [
        'monster_id' => $monitor->monster_id,
        'snapshot_id' => $newSnapshot->id,
        'effective_total_cents' => 1999,
    ]);

    $this->assertDatabaseHas('alerts', [
        'monster_id' => $monitor->monster_id,
        'monitor_id' => $monitor->id,
        'type' => 'new_best_price',
    ]);
});
