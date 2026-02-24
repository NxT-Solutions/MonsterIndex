<?php

namespace Packages\Notifications\Services;

use App\Models\ContributorAlert;

class ContributorAlertPushService
{
    public function __construct(
        private readonly WebPushService $webPushService,
    ) {}

    public function dispatchForAlertId(int $alertId): void
    {
        $alert = ContributorAlert::query()
            ->with(['user:id', 'monster:id,name,slug', 'monitor:id,site_id', 'monitor.site:id,name'])
            ->find($alertId);

        if (! $alert) {
            return;
        }

        $this->dispatchForAlert($alert);
    }

    public function dispatchForAlert(ContributorAlert $alert): void
    {
        if (! $this->webPushService->hasValidConfiguration()) {
            return;
        }

        $user = $alert->user;
        if (! $user) {
            return;
        }

        $notification = [
            'title' => $alert->title,
            'body' => $alert->body,
            'url' => $user->can('admin.access')
                ? route('admin.alerts.index', absolute: false)
                : route('contribute.alerts.index', absolute: false),
            'icon' => '/android-chrome-192x192.png',
            'badge' => '/favicon-32x32.png',
            'tag' => 'price-drop-follow-'.$alert->id,
            'data' => [
                'contributor_alert_id' => $alert->id,
                'type' => $alert->type,
                'monster' => $alert->monster?->name,
                'site' => $alert->monitor?->site?->name,
            ],
        ];

        $this->webPushService->sendToUser($user, $notification);
    }
}
