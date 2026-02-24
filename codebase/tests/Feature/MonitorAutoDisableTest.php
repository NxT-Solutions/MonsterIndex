<?php

use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\PriceSnapshot;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
use Illuminate\Support\Facades\Queue;
use Packages\Base\Data\ExtractionResult;
use Packages\Monitoring\Jobs\CheckMonitorPriceJob;
use Packages\Monitoring\Services\DomainRateLimiter;
use Packages\PriceExtraction\Services\PriceExtractionService;

it('auto-disables a monitor after five consecutive failed checks and notifies owner and admins', function () {
    Queue::fake();

    $owner = User::factory()->create([
        'role' => User::ROLE_USER,
    ]);
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
    PermissionBootstrapper::syncUserRole($owner, false);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monitor = Monitor::factory()->create([
        'created_by_user_id' => $owner->id,
        'approved_by_user_id' => $admin->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'next_check_at' => now(),
        'currency' => 'EUR',
    ]);

    $baselineSnapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'checked_at' => now()->subHours(2),
        'price_cents' => 3290,
        'shipping_cents' => 0,
        'effective_total_cents' => 3290,
        'currency' => 'EUR',
        'status' => 'ok',
    ]);

    BestPrice::query()->create([
        'monster_id' => $monitor->monster_id,
        'snapshot_id' => $baselineSnapshot->id,
        'effective_total_cents' => 3290,
        'currency' => 'EUR',
        'computed_at' => now()->subHours(2),
    ]);

    $domainRateLimiter = Mockery::mock(DomainRateLimiter::class);
    $domainRateLimiter->shouldReceive('secondsUntilAvailable')
        ->times(5)
        ->andReturn(0);
    $this->app->instance(DomainRateLimiter::class, $domainRateLimiter);

    $priceExtractionService = Mockery::mock(PriceExtractionService::class);
    $priceExtractionService->shouldReceive('extract')
        ->times(5)
        ->andReturnUsing(
            fn (): ExtractionResult => ExtractionResult::failed('EUR', 'HTTP_FETCH_FAILED'),
        );
    $this->app->instance(PriceExtractionService::class, $priceExtractionService);

    foreach (range(1, 5) as $attempt) {
        app()->call([new CheckMonitorPriceJob($monitor->id, 'scheduled'), 'handle']);
    }

    $monitor->refresh();
    expect($monitor->active)->toBeFalse()
        ->and($monitor->next_check_at)->toBeNull()
        ->and((string) $monitor->review_note)->toContain('Auto-disabled after 5 consecutive failed checks.');

    expect(PriceSnapshot::query()
        ->where('monitor_id', $monitor->id)
        ->where('status', 'failed')
        ->count())->toBe(5);

    $latestFailureSnapshotId = (int) PriceSnapshot::query()
        ->where('monitor_id', $monitor->id)
        ->where('status', 'failed')
        ->orderByDesc('id')
        ->value('id');

    $this->assertDatabaseHas('alerts', [
        'monster_id' => $monitor->monster_id,
        'monitor_id' => $monitor->id,
        'type' => 'monitor_auto_removed',
    ]);

    $this->assertDatabaseHas('contributor_alerts', [
        'user_id' => $owner->id,
        'monster_id' => $monitor->monster_id,
        'monitor_id' => $monitor->id,
        'price_snapshot_id' => $latestFailureSnapshotId,
        'type' => 'monitor_auto_removed',
        'currency' => 'EUR',
    ]);

    $this->assertDatabaseMissing('best_prices', [
        'monster_id' => $monitor->monster_id,
        'currency' => 'EUR',
    ]);
});

it('does not auto-disable a monitor before five consecutive failed checks', function () {
    Queue::fake();

    $owner = User::factory()->create([
        'role' => User::ROLE_USER,
    ]);
    PermissionBootstrapper::syncUserRole($owner, false);

    $monitor = Monitor::factory()->create([
        'created_by_user_id' => $owner->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'next_check_at' => now(),
        'currency' => 'EUR',
    ]);

    $domainRateLimiter = Mockery::mock(DomainRateLimiter::class);
    $domainRateLimiter->shouldReceive('secondsUntilAvailable')
        ->times(4)
        ->andReturn(0);
    $this->app->instance(DomainRateLimiter::class, $domainRateLimiter);

    $priceExtractionService = Mockery::mock(PriceExtractionService::class);
    $priceExtractionService->shouldReceive('extract')
        ->times(4)
        ->andReturnUsing(
            fn (): ExtractionResult => ExtractionResult::failed('EUR', 'HTTP_FETCH_FAILED'),
        );
    $this->app->instance(PriceExtractionService::class, $priceExtractionService);

    foreach (range(1, 4) as $attempt) {
        app()->call([new CheckMonitorPriceJob($monitor->id, 'scheduled'), 'handle']);
    }

    $monitor->refresh();
    expect($monitor->active)->toBeTrue();

    $this->assertDatabaseMissing('alerts', [
        'monitor_id' => $monitor->id,
        'type' => 'monitor_auto_removed',
    ]);

    $this->assertDatabaseMissing('contributor_alerts', [
        'monitor_id' => $monitor->id,
        'type' => 'monitor_auto_removed',
    ]);
});
