<?php

use App\Models\AnalyticsEvent;
use App\Models\AnalyticsPageView;
use App\Models\User;

it('stores and finalizes analytics page views', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->withHeader(
            'User-Agent',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1',
        )
        ->postJson(route('analytics.page-views.store'), [
            'visitor_id' => 'visitor-abc',
            'browser_session_id' => 'session-xyz',
            'route_name' => 'home',
            'page_component' => 'Public/BestPricesIndex',
            'path' => '/',
            'url' => 'https://monsterindex.test/?utm_source=reddit&utm_medium=social&utm_campaign=launch',
            'title' => 'MonsterIndex',
            'referrer_url' => 'https://www.google.com/search?q=monster+deals',
            'viewport_width' => 390,
            'viewport_height' => 844,
            'locale' => 'en',
        ]);

    $response
        ->assertOk()
        ->assertJsonStructure(['id']);

    $pageViewId = $response->json('id');

    $this->assertDatabaseHas('analytics_page_views', [
        'id' => $pageViewId,
        'visitor_id' => 'visitor-abc',
        'browser_session_id' => 'session-xyz',
        'user_id' => $user->id,
        'page_kind' => 'landing',
        'channel' => 'social',
        'utm_source' => 'reddit',
        'utm_medium' => 'social',
        'utm_campaign' => 'launch',
        'device_type' => 'mobile',
        'browser_family' => 'Safari',
        'os_family' => 'iOS',
    ]);

    $this->postJson(route('analytics.page-views.close', $pageViewId), [
        'visitor_id' => 'visitor-abc',
        'browser_session_id' => 'session-xyz',
        'duration_seconds' => 55,
        'max_scroll_depth' => 68,
        'engaged' => true,
    ])->assertNoContent();

    $pageView = AnalyticsPageView::query()->findOrFail($pageViewId);

    expect($pageView->duration_seconds)->toBe(55)
        ->and($pageView->max_scroll_depth)->toBe(68)
        ->and($pageView->engaged_at)->not->toBeNull()
        ->and($pageView->ended_at)->not->toBeNull();
});

it('stores analytics behavior events against a page view', function () {
    $pageView = AnalyticsPageView::query()->create([
        'visitor_id' => 'visitor-1',
        'browser_session_id' => 'session-1',
        'page_kind' => 'monster',
        'path' => '/monsters/ultra-white',
        'url' => 'https://monsterindex.test/monsters/ultra-white',
        'title' => 'Ultra White',
        'channel' => 'direct',
        'device_type' => 'desktop',
        'browser_family' => 'Chrome',
        'os_family' => 'Windows',
        'locale' => 'en',
        'is_authenticated' => false,
        'viewed_at' => now()->subMinute(),
        'last_seen_at' => now()->subMinute(),
    ]);

    $this->postJson(route('analytics.events.store'), [
        'analytics_page_view_id' => $pageView->id,
        'visitor_id' => 'visitor-1',
        'browser_session_id' => 'session-1',
        'event_name' => 'outbound_click',
        'path' => '/monsters/ultra-white',
        'label' => 'Open Cheapest Deal',
        'target_url' => 'https://shop.example/monster',
        'properties' => [
            'target' => '_blank',
        ],
    ])->assertNoContent();

    $this->assertDatabaseHas('analytics_events', [
        'analytics_page_view_id' => $pageView->id,
        'visitor_id' => 'visitor-1',
        'browser_session_id' => 'session-1',
        'event_name' => 'outbound_click',
        'target_host' => 'shop.example',
    ]);

    $event = AnalyticsEvent::query()->where('analytics_page_view_id', $pageView->id)->firstOrFail();

    expect($event->properties)->toBe([
        'target' => '_blank',
    ]);

    $pageView->refresh();

    expect($pageView->engaged_at)->not->toBeNull();
});
