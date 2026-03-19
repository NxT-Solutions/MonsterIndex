<?php

use App\Models\Alert;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use App\Models\Site;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
use Inertia\Testing\AssertableInertia as Assert;

it('renders admin alerts with latest snapshot pricing context', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monster = Monster::factory()->create();
    $site = Site::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
    ]);

    PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'checked_at' => now(),
        'effective_total_cents' => 189,
        'price_cents' => 189,
        'shipping_cents' => 0,
        'can_count' => 1,
        'price_per_can_cents' => 189,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    $alert = Alert::query()->create([
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'type' => 'new_best_price',
        'title' => 'New best price',
        'body' => 'Body',
        'read_at' => null,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.alerts.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Alerts/Index')
            ->where('alerts.data.0.id', $alert->id)
            ->where('alerts.data.0.monitor.site.name', $site->name)
            ->where('alerts.data.0.monitor.latest_snapshot.monitor_id', $monitor->id)
            ->where('alerts.data.0.monitor.latest_snapshot.price_per_can_cents', 189));
});
