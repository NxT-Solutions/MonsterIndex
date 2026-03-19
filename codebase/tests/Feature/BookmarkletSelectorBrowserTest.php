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
        ->assertSee('Guided Selector Setup', escape: false)
        ->assertSee('monsterindex-selector-toolbar', escape: false)
        ->assertSee('/bookmarklet/selector.js?', escape: false)
        ->assertSee('Monster Product');
});

it('renders a stable static snapshot for Alpine-driven content in selector browser', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monitor = Monitor::factory()->create([
        'product_url' => 'https://example.com/product/alpine-price',
    ]);

    BookmarkletSession::query()->create([
        'monitor_id' => $monitor->id,
        'created_by_user_id' => $admin->id,
        'token' => 'alpine-price-token',
        'expires_at' => now()->addMinutes(10),
        'used_at' => null,
    ]);

    Http::fake([
        'https://example.com/product/alpine-price' => Http::response(
            <<<'HTML'
            <html>
              <head>
                <title>Alpine Product</title>
                <script>window.remoteWidgetBooted = true;</script>
              </head>
              <body>
                <div class="price-shell">
                  <template x-if="ready">
                    <span class="price">€ 1,75</span>
                  </template>
                </div>
              </body>
            </html>
            HTML,
            200,
            ['Content-Type' => 'text/html'],
        ),
    ]);

    $response = $this->actingAs($admin)->get(route('admin.monitors.selector-browser', [
        'monitor' => $monitor->id,
        'token' => 'alpine-price-token',
        'url' => 'https://example.com/product/alpine-price',
    ]));

    $response
        ->assertOk()
        ->assertDontSee('window.remoteWidgetBooted = true;', escape: false)
        ->assertDontSee('<template x-if="ready">', escape: false)
        ->assertSee('&euro; 1,75', escape: false);
});

it('keeps x-cloak based overlays hidden in selector browser snapshots', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monitor = Monitor::factory()->create([
        'product_url' => 'https://example.com/product/with-overlay',
    ]);

    BookmarkletSession::query()->create([
        'monitor_id' => $monitor->id,
        'created_by_user_id' => $admin->id,
        'token' => 'overlay-token',
        'expires_at' => now()->addMinutes(10),
        'used_at' => null,
    ]);

    Http::fake([
        'https://example.com/product/with-overlay' => Http::response(
            <<<'HTML'
            <html>
              <head><title>Overlay Product</title></head>
              <body>
                <div x-cloak x-show="isLoading" class="loading-overlay">Laden...</div>
                <div class="price-shell">
                  <template x-if="ready">
                    <span class="price">€ 1,75</span>
                  </template>
                </div>
              </body>
            </html>
            HTML,
            200,
            ['Content-Type' => 'text/html'],
        ),
    ]);

    $response = $this->actingAs($admin)->get(route('admin.monitors.selector-browser', [
        'monitor' => $monitor->id,
        'token' => 'overlay-token',
        'url' => 'https://example.com/product/with-overlay',
    ]));

    $response
        ->assertOk()
        ->assertSee('[x-cloak] { display: none !important; }', escape: false)
        ->assertSee('x-cloak', escape: false)
        ->assertSee('Laden...', escape: false)
        ->assertSee('&euro; 1,75', escape: false);
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
