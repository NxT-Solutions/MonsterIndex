<?php

use Packages\Monitoring\Jobs\CheckMonitorPriceJob;
use Packages\Monitoring\Jobs\DispatchDueMonitorsJob;
use App\Models\Monitor;
use Illuminate\Support\Facades\Queue;

it('dispatches only due active monitors', function () {
    Queue::fake();

    $due = Monitor::factory()->create([
        'active' => true,
        'next_check_at' => now()->subMinute(),
    ]);

    Monitor::factory()->create([
        'active' => true,
        'next_check_at' => now()->addHour(),
    ]);

    Monitor::factory()->create([
        'active' => false,
        'next_check_at' => now()->subMinute(),
    ]);

    (new DispatchDueMonitorsJob)->handle();

    Queue::assertPushed(CheckMonitorPriceJob::class, 1);

    $due->refresh();
    expect($due->next_check_at?->isFuture())->toBeTrue();
});
