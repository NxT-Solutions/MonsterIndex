<?php

use App\Models\BestPrice;
use App\Models\ContributorAlert;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\MonsterFollow;
use App\Models\PriceSnapshot;
use App\Models\Site;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
use Inertia\Testing\AssertableInertia as Assert;
use Packages\Contributions\Services\ContributorAlertService;

it('allows contributor follow and unfollow actions with idempotent follows', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create([
        'slug' => 'follow-monster',
    ]);

    $this->actingAs($contributor)
        ->post(route('monsters.follow.store', $monster->slug), [
            'currency' => 'EUR',
        ])
        ->assertRedirect();

    $this->actingAs($contributor)
        ->post(route('monsters.follow.store', $monster->slug), [
            'currency' => 'EUR',
        ])
        ->assertRedirect();

    expect(MonsterFollow::query()
        ->where('user_id', $contributor->id)
        ->where('monster_id', $monster->id)
        ->where('currency', 'EUR')
        ->count())->toBe(1);

    $this->actingAs($contributor)
        ->delete(route('monsters.follow.destroy', $monster->slug), [
            'currency' => 'EUR',
        ])
        ->assertRedirect();

    $this->assertDatabaseMissing('monster_follows', [
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'currency' => 'EUR',
    ]);
});

it('requires auth for follow actions', function () {
    $monster = Monster::factory()->create([
        'slug' => 'auth-required-follow-monster',
    ]);

    $this->post(route('monsters.follow.store', $monster->slug), [
        'currency' => 'EUR',
    ])->assertRedirect(route('login'));
});

it('throttles follow actions after configured limit', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create([
        'slug' => 'throttle-follow-monster',
    ]);

    foreach (range(1, 30) as $attempt) {
        $this->actingAs($contributor)
            ->post(route('monsters.follow.store', $monster->slug), [
                'currency' => 'EUR',
            ])
            ->assertRedirect();
    }

    $this->actingAs($contributor)
        ->post(route('monsters.follow.store', $monster->slug), [
            'currency' => 'EUR',
        ])
        ->assertStatus(429);
});

it('creates contributor alerts on price drops with cooldown', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create();
    $site = Site::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'currency' => 'EUR',
    ]);

    MonsterFollow::query()->create([
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'currency' => 'EUR',
    ]);

    PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'checked_at' => now()->subHour(),
        'effective_total_cents' => 3600,
        'price_cents' => 3600,
        'shipping_cents' => 0,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    $current = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'checked_at' => now(),
        'effective_total_cents' => 3200,
        'price_cents' => 3200,
        'shipping_cents' => 0,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    app(ContributorAlertService::class)->handleSnapshot(
        $current,
        $monitor->fresh(['monster', 'site']),
    );

    $this->assertDatabaseHas('contributor_alerts', [
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'price_snapshot_id' => $current->id,
        'type' => 'price_drop',
        'currency' => 'EUR',
        'effective_total_cents' => 3200,
    ]);

    $duringCooldown = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'checked_at' => now()->addMinutes(10),
        'effective_total_cents' => 3000,
        'price_cents' => 3000,
        'shipping_cents' => 0,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    app(ContributorAlertService::class)->handleSnapshot(
        $duringCooldown,
        $monitor->fresh(['monster', 'site']),
    );

    expect(ContributorAlert::query()
        ->where('user_id', $contributor->id)
        ->count())->toBe(1);

    $this->travel(6)->hours();
    $this->travel(1)->minutes();

    $afterCooldown = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'checked_at' => now()->addMinutes(10),
        'effective_total_cents' => 2800,
        'price_cents' => 2800,
        'shipping_cents' => 0,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    app(ContributorAlertService::class)->handleSnapshot(
        $afterCooldown,
        $monitor->fresh(['monster', 'site']),
    );

    expect(ContributorAlert::query()
        ->where('user_id', $contributor->id)
        ->count())->toBe(2);
});

it('creates contributor alerts when a new monitor snapshot beats the previous monster best', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create();
    $siteA = Site::factory()->create();
    $siteB = Site::factory()->create();

    $existingMonitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $siteA->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'currency' => 'EUR',
    ]);

    $newMonitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $siteB->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'currency' => 'EUR',
    ]);

    MonsterFollow::query()->create([
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'currency' => 'EUR',
    ]);

    PriceSnapshot::factory()->create([
        'monitor_id' => $existingMonitor->id,
        'checked_at' => now()->subMinutes(30),
        'effective_total_cents' => 3900,
        'price_cents' => 3900,
        'shipping_cents' => 0,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    $firstNewMonitorSnapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $newMonitor->id,
        'checked_at' => now(),
        'effective_total_cents' => 3400,
        'price_cents' => 3400,
        'shipping_cents' => 0,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    app(ContributorAlertService::class)->handleSnapshot(
        $firstNewMonitorSnapshot,
        $newMonitor->fresh(['monster', 'site']),
    );

    $this->assertDatabaseHas('contributor_alerts', [
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'monitor_id' => $newMonitor->id,
        'price_snapshot_id' => $firstNewMonitorSnapshot->id,
        'type' => 'price_drop',
        'currency' => 'EUR',
        'effective_total_cents' => 3400,
    ]);
});

it('creates contributor alerts when a new monitor improves per-can price', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create();
    $siteA = Site::factory()->create();
    $siteB = Site::factory()->create();

    $existingMonitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $siteA->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'currency' => 'EUR',
    ]);

    $newMonitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $siteB->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'currency' => 'EUR',
    ]);

    MonsterFollow::query()->create([
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'currency' => 'EUR',
    ]);

    PriceSnapshot::factory()->create([
        'monitor_id' => $existingMonitor->id,
        'checked_at' => now()->subMinutes(30),
        'effective_total_cents' => 3000,
        'price_cents' => 3000,
        'shipping_cents' => 0,
        'can_count' => 12,
        'price_per_can_cents' => 250,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    $firstNewMonitorSnapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $newMonitor->id,
        'checked_at' => now(),
        'effective_total_cents' => 3600,
        'price_cents' => 3600,
        'shipping_cents' => 0,
        'can_count' => 18,
        'price_per_can_cents' => 200,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    app(ContributorAlertService::class)->handleSnapshot(
        $firstNewMonitorSnapshot,
        $newMonitor->fresh(['monster', 'site']),
    );

    $this->assertDatabaseHas('contributor_alerts', [
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'monitor_id' => $newMonitor->id,
        'price_snapshot_id' => $firstNewMonitorSnapshot->id,
        'type' => 'price_drop',
        'currency' => 'EUR',
        'effective_total_cents' => 3600,
        'title' => sprintf('Price drop: %s now EUR 2.00 per can', $monster->name),
    ]);
});

it('limits contributor alert inbox to owner and enforces mark-read ownership', function () {
    $owner = User::factory()->create(['role' => User::ROLE_USER]);
    $other = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($owner, false);
    PermissionBootstrapper::syncUserRole($other, false);

    $monster = Monster::factory()->create([
        'name' => 'Inbox Monster',
        'slug' => 'inbox-monster',
    ]);
    $site = Site::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
    ]);
    $snapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'effective_total_cents' => 2900,
        'price_cents' => 2900,
        'shipping_cents' => 0,
    ]);

    $ownedAlert = ContributorAlert::query()->create([
        'user_id' => $owner->id,
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'price_snapshot_id' => $snapshot->id,
        'type' => 'price_drop',
        'currency' => 'EUR',
        'effective_total_cents' => 2900,
        'title' => 'Owned Alert',
        'body' => 'owned body',
    ]);

    $otherAlert = ContributorAlert::query()->create([
        'user_id' => $other->id,
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'price_snapshot_id' => $snapshot->id,
        'type' => 'price_drop',
        'currency' => 'EUR',
        'effective_total_cents' => 2900,
        'title' => 'Other Alert',
        'body' => 'other body',
    ]);

    $this->actingAs($owner)
        ->get(route('contribute.alerts.index'))
        ->assertOk()
        ->assertSee('Owned Alert')
        ->assertDontSee('Other Alert');

    $this->actingAs($owner)
        ->post(route('contribute.alerts.mark-read', $ownedAlert))
        ->assertRedirect();

    expect(ContributorAlert::query()->find($ownedAlert->id)?->read_at)->not->toBeNull();

    $this->actingAs($owner)
        ->post(route('contribute.alerts.mark-read', $otherAlert))
        ->assertForbidden();

    $this->actingAs($owner)
        ->post(route('contribute.alerts.mark-all-read'))
        ->assertRedirect();

    expect(ContributorAlert::query()
        ->where('user_id', $owner->id)
        ->whereNull('read_at')
        ->count())->toBe(0)
        ->and(ContributorAlert::query()
            ->where('user_id', $other->id)
            ->whereNull('read_at')
            ->count())->toBe(1);
});

it('hydrates follow state on home and monster detail pages', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create([
        'name' => 'Hydration Monster',
        'slug' => 'hydration-monster',
    ]);
    $site = Site::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
    ]);
    $snapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'currency' => 'EUR',
        'effective_total_cents' => 2899,
        'price_cents' => 2899,
        'shipping_cents' => 0,
    ]);

    BestPrice::query()->create([
        'monster_id' => $monster->id,
        'snapshot_id' => $snapshot->id,
        'effective_total_cents' => 2899,
        'currency' => 'EUR',
        'computed_at' => now(),
    ]);

    MonsterFollow::query()->create([
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'currency' => 'EUR',
    ]);

    $this->actingAs($contributor)
        ->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/BestPricesIndex')
            ->where('bestPrices.0.monster.slug', $monster->slug)
            ->where('bestPrices.0.is_following', true));

    $this->actingAs($contributor)
        ->get(route('monsters.show', $monster->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('followed_currencies.0', 'EUR'));
});

it('always exposes price-per-can in followed monster best-offer payload', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create([
        'name' => 'Per Can Fallback Monster',
        'slug' => 'per-can-fallback-monster',
    ]);
    $site = Site::factory()->create([
        'name' => 'Fallback Store',
    ]);

    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'currency' => 'EUR',
        'selector_config' => [],
    ]);

    $snapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'currency' => 'EUR',
        'effective_total_cents' => 249,
        'price_cents' => 249,
        'shipping_cents' => 0,
        'can_count' => null,
        'price_per_can_cents' => null,
    ]);

    BestPrice::query()->create([
        'monster_id' => $monster->id,
        'snapshot_id' => $snapshot->id,
        'effective_total_cents' => 249,
        'currency' => 'EUR',
        'computed_at' => now(),
    ]);

    MonsterFollow::query()->create([
        'user_id' => $contributor->id,
        'monster_id' => $monster->id,
        'currency' => 'EUR',
    ]);

    $this->actingAs($contributor)
        ->get(route('contribute.follows.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contribute/Follows/Index')
            ->where('follows.0.monster.slug', 'per-can-fallback-monster')
            ->where('follows.0.best_offer.can_count', 1)
            ->where('follows.0.best_offer.price_per_can_cents', 249)
            ->where('follows.0.best_offer.assumed_single_can', true));
});
