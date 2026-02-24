<?php

namespace App\Http\Middleware;

use App\Models\ContributorAlert;
use App\Models\MonsterSuggestion;
use App\Models\Monitor;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $authUser = $request->user();
        $userPayload = null;
        $adminReview = null;
        $contributorAlerts = null;
        if ($authUser instanceof User) {
            PermissionBootstrapper::syncUserFromLegacyRole($authUser);

            $roles = PermissionBootstrapper::isReady()
                ? $authUser->getRoleNames()->values()->all()
                : [];
            $permissions = PermissionBootstrapper::isReady()
                ? $authUser->getAllPermissions()->pluck('name')->sort()->values()->all()
                : [];

            $userPayload = [
                ...$authUser->only([
                    'id',
                    'name',
                    'email',
                    'avatar_url',
                    'role',
                ]),
                'roles' => $roles,
                'permissions' => $permissions,
                'can' => [
                    'admin_access' => $authUser->can('admin.access'),
                    'monitor_submit' => $authUser->can('monitor.submit'),
                    'monitor_manage_any' => $authUser->can('monitors.manage.any'),
                    'monitor_review' => $authUser->can('monitor.approve') || $authUser->can('monitor.reject'),
                    'monster_suggestion_submit' => $authUser->can('monster-suggestion.submit'),
                    'monster_suggestion_review' => $authUser->can('monster-suggestion.review'),
                    'stores_manage' => $authUser->can('stores.manage'),
                    'monsters_manage' => $authUser->can('monsters.manage'),
                    'monster_follow' => $authUser->can('monster.follow'),
                    'contributor_alert_view' => $authUser->can('contributor-alert.view.own'),
                    'contributor_alert_mark_read' => $authUser->can('contributor-alert.mark-read.own'),
                ],
            ];

            if ($authUser->can('monitor.approve') || $authUser->can('monster-suggestion.review')) {
                $adminReview = [
                    'pending_monitors' => $authUser->can('monitor.approve')
                        ? Monitor::query()
                            ->where('submission_status', Monitor::STATUS_PENDING_REVIEW)
                            ->count()
                        : 0,
                    'pending_suggestions' => $authUser->can('monster-suggestion.review')
                        ? MonsterSuggestion::query()
                            ->where('status', MonsterSuggestion::STATUS_PENDING)
                            ->count()
                        : 0,
                    ];
            }

            if ($authUser->can('contributor-alert.view.own')) {
                $contributorAlerts = [
                    'unread' => ContributorAlert::query()
                        ->where('user_id', $authUser->id)
                        ->whereNull('read_at')
                        ->count(),
                    'total' => ContributorAlert::query()
                        ->where('user_id', $authUser->id)
                        ->count(),
                ];
            }
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $userPayload,
            ],
            'adminReview' => $adminReview,
            'contributorAlerts' => $contributorAlerts,
        ];
    }
}
