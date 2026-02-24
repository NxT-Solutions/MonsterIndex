<?php

namespace Packages\Notifications\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Packages\Notifications\Services\InAppAlertPushService;

class DispatchAlertPushJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly int $alertId,
    ) {}

    public function handle(InAppAlertPushService $inAppAlertPushService): void
    {
        $inAppAlertPushService->dispatchForAlertId($this->alertId);
    }
}

