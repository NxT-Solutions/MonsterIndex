<?php

use App\Models\Alert;
use App\Models\AnalyticsEvent;
use App\Models\AnalyticsPageView;
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

    $pageView = AnalyticsPageView::query()->create([
        'visitor_id' => 'visitor-1',
        'browser_session_id' => 'session-1',
        'user_id' => $admin->id,
        'route_name' => 'home',
        'page_component' => 'Public/BestPricesIndex',
        'page_kind' => 'landing',
        'path' => '/',
        'url' => 'https://monsterindex.test/',
        'title' => 'MonsterIndex',
        'channel' => 'direct',
        'device_type' => 'desktop',
        'browser_family' => 'Chrome',
        'os_family' => 'macOS',
        'locale' => 'en',
        'is_authenticated' => true,
        'duration_seconds' => 42,
        'max_scroll_depth' => 74,
        'viewed_at' => now()->subMinutes(3),
        'engaged_at' => now()->subMinutes(2),
        'last_seen_at' => now()->subMinutes(2),
        'ended_at' => now()->subMinutes(2),
    ]);

    AnalyticsEvent::query()->create([
        'analytics_page_view_id' => $pageView->id,
        'visitor_id' => 'visitor-1',
        'browser_session_id' => 'session-1',
        'user_id' => $admin->id,
        'event_name' => 'outbound_click',
        'page_kind' => 'landing',
        'path' => '/',
        'label' => 'Open deal',
        'target_host' => 'amazon.example',
        'target_url' => 'https://amazon.example/monster',
        'occurred_at' => now()->subMinutes(2),
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
            ->where('analytics.summary.page_views_30d', 1)
            ->where('analytics.summary.unique_visitors_30d', 1)
            ->has('analytics.traffic.daily_views')
            ->has('analytics.traffic.recent_visits')
            ->has('analytics.audience.devices')
            ->has('analytics.behavior.top_pages')
            ->has('recentRuns'));
});
