<?php

use Packages\Base\Data\ExtractionResult;
use App\Models\BookmarkletSession;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\Site;
use App\Models\User;
use Packages\PriceExtraction\Services\PriceExtractionService;

it('rejects expired bookmarklet capture token', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $monster = Monster::factory()->create();
    $site = Site::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
    ]);

    BookmarkletSession::query()->create([
        'monitor_id' => $monitor->id,
        'created_by_user_id' => $admin->id,
        'token' => 'expired-token',
        'expires_at' => now()->subMinute(),
        'used_at' => null,
    ]);

    $this->postJson(route('api.bookmarklet.capture'), [
        'token' => 'expired-token',
        'page_url' => 'https://example.com/product',
        'selectors' => [
            'price' => ['css' => '.price'],
        ],
    ])->assertUnauthorized();
});

it('captures selector payload with valid token', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $monster = Monster::factory()->create();
    $site = Site::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
    ]);

    $session = BookmarkletSession::query()->create([
        'monitor_id' => $monitor->id,
        'created_by_user_id' => $admin->id,
        'token' => 'valid-token',
        'expires_at' => now()->addMinutes(10),
        'used_at' => null,
    ]);

    $mock = \Mockery::mock(PriceExtractionService::class);
    $mock->shouldReceive('extract')->once()->andReturn(new ExtractionResult(
        priceCents: 1999,
        shippingCents: 399,
        effectiveTotalCents: 2398,
        currency: 'USD',
        status: 'ok',
        rawText: '$19.99 | $3.99',
        canCount: 12,
        pricePerCanCents: 200,
    ));
    $this->app->instance(PriceExtractionService::class, $mock);

    $this->postJson(route('api.bookmarklet.capture'), [
        'token' => 'valid-token',
        'page_url' => 'https://example.com/product',
        'selectors' => [
            'price' => ['css' => '.price', 'xpath' => '//*[@class="price"]'],
            'shipping' => ['css' => '.shipping', 'xpath' => '//*[@class="shipping"]'],
            'quantity' => ['css' => '.pack-size', 'xpath' => '//*[@class="pack-size"]'],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('can_count', 12)
        ->assertJsonPath('price_per_can_cents', 200);

    $monitor->refresh();
    $session->refresh();

    expect($monitor->product_url)->toBe('https://example.com/product')
        ->and($monitor->selector_config['price']['css'] ?? null)->toBe('.price')
        ->and($monitor->selector_config['quantity']['css'] ?? null)->toBe('.pack-size')
        ->and($session->used_at)->not->toBeNull();
});
