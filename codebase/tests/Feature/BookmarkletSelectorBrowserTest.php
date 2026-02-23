<?php

use App\Models\BookmarkletSession;
use App\Models\Monitor;
use App\Models\User;
use Illuminate\Support\Facades\Http;

it('renders selector browser for valid admin token and monitor', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monitor = Monitor::factory()->create([
        'product_url' => 'https://example.com/product/monster',
    ]);

    BookmarkletSession::query()->create([
        'monitor_id' => $monitor->id,
        'created_by_user_id' => $admin->id,
        'token' => 'valid-selector-token',
        'expires_at' => now()->addMinutes(10),
        'used_at' => null,
    ]);

    Http::fake([
        'https://example.com/product/monster' => Http::response(
            '<html><head><title>Monster Product</title></head><body><main><div class="price">$19.99</div></main></body></html>',
            200,
            ['Content-Type' => 'text/html'],
        ),
    ]);

    $this->actingAs($admin)
        ->get(route('admin.monitors.selector-browser', [
            'monitor' => $monitor->id,
            'token' => 'valid-selector-token',
            'url' => 'https://example.com/product/monster',
        ]))
        ->assertOk()
        ->assertSee('MonsterIndex Selector Mode', escape: false)
        ->assertSee('monsterindex-selector-toolbar', escape: false)
        ->assertSee('/bookmarklet/selector.js?', escape: false)
        ->assertSee('Monster Product');
});

it('rejects selector browser access when token does not belong to monitor', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monitorA = Monitor::factory()->create();
    $monitorB = Monitor::factory()->create();

    BookmarkletSession::query()->create([
        'monitor_id' => $monitorA->id,
        'created_by_user_id' => $admin->id,
        'token' => 'monitor-a-token',
        'expires_at' => now()->addMinutes(10),
        'used_at' => null,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.monitors.selector-browser', [
            'monitor' => $monitorB->id,
            'token' => 'monitor-a-token',
            'url' => 'https://example.com/other-page',
        ]))
        ->assertForbidden();
});

it('rejects selector browser access when token belongs to another user', function () {
    $creator = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
    $otherAdmin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monitor = Monitor::factory()->create();

    BookmarkletSession::query()->create([
        'monitor_id' => $monitor->id,
        'created_by_user_id' => $creator->id,
        'token' => 'creator-only-token',
        'expires_at' => now()->addMinutes(10),
        'used_at' => null,
    ]);

    $this->actingAs($otherAdmin)
        ->get(route('admin.monitors.selector-browser', [
            'monitor' => $monitor->id,
            'token' => 'creator-only-token',
            'url' => 'https://example.com/other-page',
        ]))
        ->assertForbidden();
});
