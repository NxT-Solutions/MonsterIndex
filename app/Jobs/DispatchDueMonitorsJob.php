<?php

namespace App\Jobs;

use App\Models\Monitor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class DispatchDueMonitorsJob implements ShouldQueue
{
    use Queueable;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $dueMonitorIds = Monitor::query()
            ->where('active', true)
            ->whereNotNull('next_check_at')
            ->where('next_check_at', '<=', now())
            ->orderBy('next_check_at')
            ->limit(200)
            ->pluck('id');

        foreach ($dueMonitorIds as $monitorId) {
            DB::transaction(function () use ($monitorId): void {
                $monitor = Monitor::query()->lockForUpdate()->find($monitorId);

                if (! $monitor || ! $monitor->active || ! $monitor->next_check_at || $monitor->next_check_at->isFuture()) {
                    return;
                }

                $monitor->scheduleNextCheck();
                $monitor->save();

                CheckMonitorPriceJob::dispatch($monitor->id, 'scheduled');
            });
        }
    }
}
