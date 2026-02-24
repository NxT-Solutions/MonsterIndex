<?php

namespace App\Observers;

use App\Models\ContributorAlert;
use Packages\Notifications\Jobs\DispatchContributorAlertPushJob;

class ContributorAlertObserver
{
    public function created(ContributorAlert $alert): void
    {
        DispatchContributorAlertPushJob::dispatch($alert->id);
    }
}
