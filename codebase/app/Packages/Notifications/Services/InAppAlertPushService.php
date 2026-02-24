<?php

namespace Packages\Notifications\Services;

use App\Models\Alert;
use App\Models\User;

class InAppAlertPushService
{
    public function __construct(
        private readonly WebPushService $webPushService,
    ) {}

    public function dispatchForAlertId(int $alertId): void
    {
        $alert = Alert::query()
            ->with(['monster:id,name,slug', 'monitor:id,site_id', 'monitor.site:id,name'])
            ->find($alertId);

        if (! $alert) {
            return;
        }

        $this->dispatchForAlert($alert);
    }

    public function dispatchForAlert(Alert $alert): void
    {
        if (! $this->webPushService->hasValidConfiguration()) {
            return;
        }

        $users = User::query()
            ->permission('admin.access')
            ->get();

        if ($users->isEmpty()) {
            return;
        }

        $notification = [
            'title' => $alert->title,
            'body' => $alert->body,
            'url' => route('admin.alerts.index', absolute: false),
            'icon' => '/android-chrome-192x192.png',
            'badge' => '/favicon-32x32.png',
            'tag' => 'admin-alert-'.$alert->id,
            'data' => [
                'alert_id' => $alert->id,
                'type' => $alert->type,
                'monster' => $alert->monster?->name,
                'site' => $alert->monitor?->site?->name,
            ],
        ];

        foreach ($users as $user) {
            $this->webPushService->sendToUser($user, $notification);
        }
    }
}

