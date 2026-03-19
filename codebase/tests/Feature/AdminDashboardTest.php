<?php

use App\Models\Alert;
use App\Models\Monitor;
use App\Models\MonitorRun;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use App\Models\Site;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
use Inertia\Testing\AssertableInertia as Assert;

it('renders admin dashboard with stats and chart props', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monster = Monster::factory()->create();
    $site = Site::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'selector_config' => [
            'price' => [
                'css' => '.price',
            ],
        ],
    ]);

    $snapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'status' => 'ok',
        'checked_at' => now()->subHour(),
    ]);

    MonitorRun::query()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now()->subMinutes(5),
        'finished_at' => now()->subMinutes(2),
        'status' => 'ok',
        'attempt' => 1,
        'error_message' => null,
    ]);

    Alert::query()->create([
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'type' => 'new_best_price',
        'title' => 'New best',
        'body' => 'Better offer detected.',
        'read_at' => null,
    ]);

    $expectedMonsterCount = Monster::query()->count();

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('stats.monsters_total', $expectedMonsterCount)
            ->where('stats.monitors_total', 1)
            ->where('stats.monitors_with_selector', 1)
            ->where('stats.alerts_unread', 1)
            ->has('charts.snapshots_daily')
            ->has('charts.alerts_daily')
            ->has('charts.top_domains')
            ->has('recentRuns'));
});
