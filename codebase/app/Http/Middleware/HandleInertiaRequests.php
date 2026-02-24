<?php

namespace App\Http\Middleware;

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
                ],
            ];
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $userPayload,
            ],
        ];
    }
}
