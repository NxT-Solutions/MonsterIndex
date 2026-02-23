<?php

use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use App\Models\Site;
use Inertia\Testing\AssertableInertia as Assert;

it('returns landing page with branding, trending tracks, and best prices props', function () {
    seedOffer(
        slug: 'monster-landing-one',
        effectiveTotalCents: 2899,
        canCount: 12,
        pricePerCanCents: 242,
        checkedAt: now()->subHour(),
    );

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/BestPricesIndex')
            ->has('bestPrices', 1)
            ->has('trendingTracks', 1)
            ->where('branding.name', config('branding.name'))
            ->where('branding.primary_cta_label', config('branding.primary_cta_label'))
            ->where('branding.secondary_cta_label', config('branding.secondary_cta_label'))
            ->where('bestPrices.0.monster.slug', 'monster-landing-one'));
});

it('ranks trending tracks by best per-can value first', function () {
    seedOffer(
        slug: 'monster-cheaper-per-can',
        effectiveTotalCents: 3000,
        canCount: 15,
        pricePerCanCents: 200,
        checkedAt: now()->subHours(2),
    );

    seedOffer(
        slug: 'monster-expensive-per-can',
        effectiveTotalCents: 3200,
        canCount: 10,
        pricePerCanCents: 320,
        checkedAt: now()->subHours(2),
    );

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('trendingTracks.0.monster.slug', 'monster-cheaper-per-can')
            ->where('trendingTracks.1.monster.slug', 'monster-expensive-per-can'));
});

it('uses latest checked time as tie breaker when per-can values are equal', function () {
    seedOffer(
        slug: 'monster-newer',
        effectiveTotalCents: 3300,
        canCount: 12,
        pricePerCanCents: 275,
        checkedAt: now()->subMinutes(45),
    );

    seedOffer(
        slug: 'monster-older',
        effectiveTotalCents: 3300,
        canCount: 12,
        pricePerCanCents: 275,
        checkedAt: now()->subHours(8),
    );

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('trendingTracks.0.monster.slug', 'monster-newer')
            ->where('trendingTracks.1.monster.slug', 'monster-older'));
});

it('derives can-count and per-can values from manual selector config when snapshot values are missing', function () {
    seedOffer(
        slug: 'monster-manual-can-count',
        effectiveTotalCents: 3290,
        canCount: null,
        pricePerCanCents: null,
        checkedAt: now()->subHour(),
        selectorConfig: [
            'price' => ['css' => '.price'],
            'quantity' => ['manual_value' => '12'],
        ],
    );

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('bestPrices.0.monster.slug', 'monster-manual-can-count')
            ->where('bestPrices.0.can_count', 12)
            ->where('bestPrices.0.price_per_can_cents', 274)
            ->where('trendingTracks.0.can_count', 12)
            ->where('trendingTracks.0.price_per_can_cents', 274));
});

function seedOffer(
    string $slug,
    int $effectiveTotalCents,
    ?int $canCount,
    ?int $pricePerCanCents,
    \Illuminate\Support\Carbon $checkedAt,
    ?array $selectorConfig = null,
): void {
    $monster = Monster::factory()->create([
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'slug' => $slug,
    ]);

    $site = Site::factory()->create([
        'name' => 'Landing Store '.str($slug)->afterLast('-')->title()->toString(),
        'domain' => $slug.'.example',
    ]);

    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'selector_config' => $selectorConfig ?? [
            'price' => ['css' => '.price'],
        ],
    ]);

    $snapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'currency' => 'EUR',
        'effective_total_cents' => $effectiveTotalCents,
        'price_cents' => $effectiveTotalCents,
        'shipping_cents' => 0,
        'can_count' => $canCount,
        'price_per_can_cents' => $pricePerCanCents,
        'checked_at' => $checkedAt,
    ]);

    BestPrice::query()->create([
        'monster_id' => $monster->id,
        'snapshot_id' => $snapshot->id,
        'effective_total_cents' => $effectiveTotalCents,
        'currency' => 'EUR',
        'computed_at' => $checkedAt,
    ]);
}
