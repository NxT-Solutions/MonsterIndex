<?php

use App\Models\Monster;
use App\Models\Site;
use App\Models\User;

it('allows admin to add a site record directly from the monster workflow', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monster = Monster::factory()->create([
        'slug' => 'monster-workflow-test',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.monsters.records.store', $monster->slug), [
            'site_name' => 'Small Shop',
            'product_url' => 'https://shop.example.com/products/monster-12-pack',
            'currency' => 'usd',
            'check_interval_minutes' => 60,
            'active' => true,
        ])
        ->assertRedirect();

    $site = Site::query()->where('domain', 'shop.example.com')->first();

    expect($site)->not->toBeNull();

    $this->assertDatabaseHas('monitors', [
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'product_url' => 'https://shop.example.com/products/monster-12-pack',
        'currency' => 'USD',
        'check_interval_minutes' => 60,
        'active' => true,
    ]);
});
