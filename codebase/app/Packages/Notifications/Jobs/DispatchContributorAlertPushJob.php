<?php

namespace Packages\Notifications\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Packages\Notifications\Services\ContributorAlertPushService;

class DispatchContributorAlertPushJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly int $alertId,
    ) {}

    public function handle(ContributorAlertPushService $contributorAlertPushService): void
    {
        $contributorAlertPushService->dispatchForAlertId($this->alertId);
    }
}
