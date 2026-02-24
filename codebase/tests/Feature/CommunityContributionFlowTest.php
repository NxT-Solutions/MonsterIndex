<?php

use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use App\Models\Site;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
use Illuminate\Support\Facades\Queue;
use Packages\Base\Data\ExtractionResult;
use Packages\Monitoring\Jobs\CheckMonitorPriceJob;
use Packages\PriceExtraction\Services\PriceExtractionService;

it('allows contributors to create draft monitor proposals and blocks canonical duplicates', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create();
    $site = Site::factory()->create();

    $this->actingAs($contributor)
        ->post(route('contribute.monitors.store'), [
            'monster_id' => $monster->id,
            'site_id' => $site->id,
            'product_url' => 'https://www.example.com/product/monster-ultra?utm_source=feed',
            'currency' => 'EUR',
            'check_interval_minutes' => 15,
        ])
        ->assertRedirect();

    $monitor = Monitor::query()->first();
    expect($monitor)->not->toBeNull()
        ->and($monitor?->submission_status)->toBe(Monitor::STATUS_DRAFT)
        ->and($monitor?->active)->toBeFalse()
        ->and($monitor?->canonical_product_url)->toBe('https://example.com/product/monster-ultra')
        ->and($monitor?->check_interval_minutes)->toBe(60);

    $this->actingAs($contributor)
        ->post(route('contribute.monitors.store'), [
            'monster_id' => $monster->id,
            'site_id' => $site->id,
            'product_url' => 'https://example.com/product/monster-ultra?utm_medium=email',
            'currency' => 'EUR',
        ])
        ->assertSessionHasErrors('product_url');
});

it('prevents contributors from editing monitors they do not own', function () {
    $owner = User::factory()->create(['role' => User::ROLE_USER]);
    $otherContributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($owner, false);
    PermissionBootstrapper::syncUserRole($otherContributor, false);

    $monitor = Monitor::factory()->create([
        'created_by_user_id' => $owner->id,
        'submission_status' => Monitor::STATUS_DRAFT,
        'active' => false,
    ]);

    $this->actingAs($otherContributor)
        ->put(route('contribute.monitors.update', $monitor), [
            'monster_id' => $monitor->monster_id,
            'site_id' => $monitor->site_id,
            'product_url' => $monitor->product_url,
            'currency' => $monitor->currency,
        ])
        ->assertForbidden();
});

it('submits a monitor for review and allows admin approval with immediate queueing', function () {
    Queue::fake();

    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    PermissionBootstrapper::syncUserRole($contributor, false);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monitor = Monitor::factory()->create([
        'created_by_user_id' => $contributor->id,
        'approved_by_user_id' => null,
        'submission_status' => Monitor::STATUS_DRAFT,
        'validation_status' => Monitor::VALIDATION_PENDING,
        'active' => false,
        'selector_config' => [
            'price' => ['css' => '.price'],
        ],
    ]);

    $mock = Mockery::mock(PriceExtractionService::class);
    $mock->shouldReceive('extract')->once()->andReturn(new ExtractionResult(
        priceCents: 3290,
        shippingCents: null,
        effectiveTotalCents: 3290,
        currency: 'EUR',
        status: 'ok',
        rawText: null,
    ));
    $this->app->instance(PriceExtractionService::class, $mock);

    $this->actingAs($contributor)
        ->post(route('contribute.monitors.submit', $monitor))
        ->assertRedirect();

    $monitor->refresh();
    expect($monitor->submission_status)->toBe(Monitor::STATUS_PENDING_REVIEW)
        ->and($monitor->validation_status)->toBe(Monitor::VALIDATION_SUCCESS)
        ->and($monitor->active)->toBeFalse();

    $this->actingAs($admin)
        ->post(route('admin.review.monitors.approve', $monitor))
        ->assertRedirect();

    $monitor->refresh();
    expect($monitor->submission_status)->toBe(Monitor::STATUS_APPROVED)
        ->and($monitor->active)->toBeTrue()
        ->and((int) $monitor->approved_by_user_id)->toBe((int) $admin->id);

    Queue::assertPushed(CheckMonitorPriceJob::class);
});

it('allows admin force-approval for failed validation proposals', function () {
    Queue::fake();

    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monitor = Monitor::factory()->create([
        'submission_status' => Monitor::STATUS_PENDING_REVIEW,
        'validation_status' => Monitor::VALIDATION_FAILED,
        'validation_result' => ['status' => 'failed', 'error_code' => 'NO_PRICE'],
        'active' => false,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.review.monitors.force-approve', $monitor))
        ->assertRedirect();

    $monitor->refresh();
    expect($monitor->submission_status)->toBe(Monitor::STATUS_APPROVED)
        ->and($monitor->active)->toBeTrue()
        ->and($monitor->validation_result['forced_approval'] ?? false)->toBeTrue();

    Queue::assertPushed(CheckMonitorPriceJob::class);
});

it('keeps public board visibility limited to approved monitors only', function () {
    $monster = Monster::factory()->create([
        'name' => 'Community Visibility Monster',
        'slug' => 'community-visibility-monster',
    ]);
    $site = Site::factory()->create([
        'name' => 'Approved Store',
        'domain' => 'approved-store.example',
    ]);

    $approvedMonitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
    ]);
    $approvedSnapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $approvedMonitor->id,
        'effective_total_cents' => 2999,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);
    BestPrice::query()->create([
        'monster_id' => $monster->id,
        'snapshot_id' => $approvedSnapshot->id,
        'effective_total_cents' => 2999,
        'currency' => 'EUR',
        'computed_at' => now(),
    ]);

    $pendingMonitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
        'submission_status' => Monitor::STATUS_PENDING_REVIEW,
        'active' => true,
    ]);
    PriceSnapshot::factory()->create([
        'monitor_id' => $pendingMonitor->id,
        'effective_total_cents' => 1999,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    $this->getJson(route('api.public.best-prices'))
        ->assertOk()
        ->assertJsonPath('data.0.effective_total_cents', 2999);

    $this->get(route('monsters.show', $monster->slug))
        ->assertOk()
        ->assertSee('Approved Store')
        ->assertDontSee('pending_review');
});

it('returns forbidden for contributors trying to access admin moderation pages', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $this->actingAs($contributor)
        ->get(route('admin.review.monitors.index'))
        ->assertForbidden();
});

it('throttles monitor proposal creation after hourly quota', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    $monster = Monster::factory()->create();
    $site = Site::factory()->create();

    foreach (range(1, 6) as $attempt) {
        $this->actingAs($contributor)
            ->post(route('contribute.monitors.store'), [
                'monster_id' => $monster->id,
                'site_id' => $site->id,
                'product_url' => "https://example.com/product/monster-{$attempt}",
                'currency' => 'EUR',
            ])
            ->assertRedirect();
    }

    $this->actingAs($contributor)
        ->post(route('contribute.monitors.store'), [
            'monster_id' => $monster->id,
            'site_id' => $site->id,
            'product_url' => 'https://example.com/product/monster-overflow',
            'currency' => 'EUR',
        ])
        ->assertStatus(429);
});
