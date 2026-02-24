<?php

use App\Models\Monster;
use App\Models\Site;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Packages\Monitoring\Jobs\CheckMonitorPriceJob;

it('creates a new store from product url when monitor form uses other store option', function () {
    Queue::fake();

    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monster = Monster::factory()->create();

    $this->actingAs($admin)
        ->post(route('admin.monitors.store'), [
            'monster_id' => $monster->id,
            'site_id' => null,
            'create_site' => true,
            'site_name' => 'Small Energy Shop',
            'product_url' => 'https://shop.smallenergy.example/products/monster-ultra',
            'currency' => 'EUR',
            'check_interval_minutes' => 60,
            'active' => true,
        ])
        ->assertRedirect();

    $site = Site::query()->where('domain', 'shop.smallenergy.example')->first();

    expect($site)->not->toBeNull()
        ->and($site?->name)->toBe('Small Energy Shop');

    $this->assertDatabaseHas('monitors', [
        'monster_id' => $monster->id,
        'site_id' => $site?->id,
        'product_url' => 'https://shop.smallenergy.example/products/monster-ultra',
        'currency' => 'EUR',
    ]);

    Queue::assertPushed(CheckMonitorPriceJob::class);
});
