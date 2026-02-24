<?php

use App\Models\Monitor;
use App\Models\MonitorRun;
use App\Models\Monster;
use App\Models\Site;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Packages\Monitoring\Jobs\CheckMonitorPriceJob;

it('creates a queued monitor run when admin triggers run-now', function () {
    Queue::fake();

    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monitor = Monitor::factory()->create();

    $response = $this->actingAs($admin)
        ->postJson(route('api.admin.monitors.run-now', $monitor->id));

    $response->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonStructure(['monitor_run_id']);

    $this->assertDatabaseHas('monitor_runs', [
        'monitor_id' => $monitor->id,
        'status' => 'queued',
    ]);

    Queue::assertPushed(CheckMonitorPriceJob::class);
});

it('streams running monitor ids for admin monster records', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monster = Monster::factory()->create([
        'slug' => 'monster-stream-test',
    ]);

    $site = Site::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => $site->id,
    ]);

    MonitorRun::query()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now(),
        'status' => 'running',
        'attempt' => 1,
    ]);

    $response = $this->actingAs($admin)->get(
        route('api.admin.monsters.records.events', [
            'monster' => $monster->slug,
            'once' => 1,
        ]),
    );

    $response->assertOk();
    expect((string) $response->headers->get('Content-Type'))
        ->toContain('text/event-stream');

    $content = $response->streamedContent();
    expect($content)->toContain('event: monitor-runs')
        ->toContain('"running_monitor_ids":['.$monitor->id.']');
});

it('streams running monitor ids for admin monitor index page', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monitor = Monitor::factory()->create();

    MonitorRun::query()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now(),
        'status' => 'running',
        'attempt' => 1,
    ]);

    $response = $this->actingAs($admin)->get(
        route('api.admin.monitors.events', [
            'once' => 1,
        ]),
    );

    $response->assertOk();
    expect((string) $response->headers->get('Content-Type'))
        ->toContain('text/event-stream');

    $content = $response->streamedContent();
    expect($content)->toContain('event: monitor-runs')
        ->toContain('"running_monitor_ids":['.$monitor->id.']');
});

it('marks a queued run as skipped when monitor is no longer runnable', function () {
    $monitor = Monitor::factory()->create([
        'active' => false,
        'submission_status' => Monitor::STATUS_APPROVED,
    ]);

    $run = MonitorRun::query()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now(),
        'status' => 'queued',
        'attempt' => 1,
    ]);

    dispatch_sync(new CheckMonitorPriceJob($monitor->id, 'manual', $run->id));

    $run->refresh();

    expect($run->status)->toBe('skipped')
        ->and($run->finished_at)->not->toBeNull()
        ->and($run->error_message)->toContain('not active or approved');
});

it('ignores stale unfinished runs when a newer run already exists', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $monitor = Monitor::factory()->create();

    MonitorRun::query()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now()->subMinute(),
        'status' => 'queued',
        'attempt' => 1,
        'finished_at' => null,
    ]);

    MonitorRun::query()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now(),
        'status' => 'success',
        'attempt' => 1,
        'finished_at' => now(),
    ]);

    $response = $this->actingAs($admin)->get(
        route('api.admin.monitors.events', [
            'once' => 1,
        ]),
    );

    $response->assertOk();
    $content = $response->streamedContent();
    expect($content)->toContain('event: monitor-runs')
        ->toContain('"running_monitor_ids":[]');
});
