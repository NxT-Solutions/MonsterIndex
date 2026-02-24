<?php

use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use Illuminate\Support\Facades\Queue;
use Packages\Monitoring\Services\BestPriceProjector;

it('creates alert when a lower best price is found', function () {
    Queue::fake();

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

it('creates alert when a newly added monitor improves per-can price', function () {
    Queue::fake();

    $monster = Monster::factory()->create();
    $oldMonitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
    ]);
    $newMonitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
    ]);

    $oldSnapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $oldMonitor->id,
        'checked_at' => now()->subHour(),
        'effective_total_cents' => 3000,
        'price_cents' => 3000,
        'shipping_cents' => 0,
        'can_count' => 12,
        'price_per_can_cents' => 250,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    BestPrice::query()->create([
        'monster_id' => $monster->id,
        'snapshot_id' => $oldSnapshot->id,
        'effective_total_cents' => 3000,
        'currency' => 'EUR',
        'computed_at' => now(),
    ]);

    $newSnapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $newMonitor->id,
        'checked_at' => now(),
        'effective_total_cents' => 3600,
        'price_cents' => 3600,
        'shipping_cents' => 0,
        'can_count' => 18,
        'price_per_can_cents' => 200,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    app(BestPriceProjector::class)->projectFromSnapshot($newSnapshot);

    $this->assertDatabaseHas('alerts', [
        'monster_id' => $monster->id,
        'monitor_id' => $newMonitor->id,
        'type' => 'new_best_price',
        'title' => sprintf('New best per-can price for %s', $monster->name),
    ]);

    $this->assertDatabaseHas('best_prices', [
        'monster_id' => $monster->id,
        'snapshot_id' => $oldSnapshot->id,
        'currency' => 'EUR',
    ]);
});
