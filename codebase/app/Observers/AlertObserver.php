<?php

namespace App\Observers;

use App\Models\Alert;
use Packages\Notifications\Jobs\DispatchAlertPushJob;

class AlertObserver
{
    public function created(Alert $alert): void
    {
        DispatchAlertPushJob::dispatch($alert->id);
    }
}

