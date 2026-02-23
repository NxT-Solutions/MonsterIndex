<?php

use App\Jobs\DispatchDueMonitorsJob;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment('Keep shipping.');
})->purpose('Display an inspiring quote');

Schedule::job(new DispatchDueMonitorsJob)
    ->everyMinute()
    ->withoutOverlapping();
