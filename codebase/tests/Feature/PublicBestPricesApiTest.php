<?php

use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use App\Models\Site;

it('returns public best prices feed', function () {
    $monster = Monster::factory()->create([
        'name' => 'Monster Public Feed',
        'slug' => 'monster-public-feed',
    ]);
    $site = Site::factory()->create([
        'name' => 'Feed Store',
        'domain' => 'feed-store.example',
    ]);
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'currency' => 'USD',
    ]);

    $snapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'currency' => 'USD',
        'effective_total_cents' => 1899,
        'price_cents' => 1599,
        'shipping_cents' => 300,
    ]);

    BestPrice::query()->create([
        'monster_id' => $monster->id,
        'snapshot_id' => $snapshot->id,
        'effective_total_cents' => 1899,
        'currency' => 'USD',
        'computed_at' => now(),
    ]);

    $this->getJson(route('api.public.best-prices'))
        ->assertOk()
        ->assertJsonPath('data.0.monster.slug', 'monster-public-feed')
        ->assertJsonPath('data.0.effective_total_cents', 1899);
});
