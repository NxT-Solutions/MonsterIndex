<?php

namespace App\Support\Authorization;

use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionBootstrapper
{
    public const ROLE_ADMIN = 'admin';

    public const ROLE_CONTRIBUTOR = 'contributor';

    /**
     * @return list<string>
     */
    public static function allPermissions(): array
    {
        return [
            'admin.access',
            'monsters.manage',
            'stores.manage',
            'monitors.manage.any',
            'monitor.submit',
            'monitor.view.own',
            'monitor.update.own',
            'monitor.delete.own',
            'monitor.approve',
            'monitor.reject',
            'monitor.force-approve',
            'monster-suggestion.submit',
            'monster-suggestion.view.own',
            'monster-suggestion.review',
            'monster.follow',
            'contributor-alert.view.own',
            'contributor-alert.mark-read.own',
        ];
    }

    /**
     * @return list<string>
     */
    public static function contributorPermissions(): array
    {
        return [
            'monitor.submit',
            'monitor.view.own',
            'monitor.update.own',
            'monitor.delete.own',
            'monster-suggestion.submit',
            'monster-suggestion.view.own',
            'monster.follow',
            'contributor-alert.view.own',
            'contributor-alert.mark-read.own',
        ];
    }

    public static function ensureSynced(): void
    {
        if (! self::permissionTablesExist()) {
            return;
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissionModels = collect(self::allPermissions())
            ->mapWithKeys(fn (string $permissionName): array => [
                $permissionName => Permission::findOrCreate($permissionName, 'web'),
            ]);

        $adminRole = Role::findOrCreate(self::ROLE_ADMIN, 'web');
        $contributorRole = Role::findOrCreate(self::ROLE_CONTRIBUTOR, 'web');

        $expectedAdmin = collect(self::allPermissions())->sort()->values()->all();
        $existingAdmin = $adminRole->permissions()->pluck('name')->sort()->values()->all();
        if ($expectedAdmin !== $existingAdmin) {
            $adminRole->syncPermissions($permissionModels->values()->all());
        }

        $expectedContributor = collect(self::contributorPermissions())->sort()->values()->all();
        $existingContributor = $contributorRole->permissions()->pluck('name')->sort()->values()->all();
        if ($expectedContributor !== $existingContributor) {
            $contributorRole->syncPermissions(
                collect(self::contributorPermissions())
                    ->map(fn (string $permissionName): Permission => $permissionModels->get($permissionName))
                    ->filter()
                    ->values()
                    ->all(),
            );
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

    }

    public static function syncUserRole(User $user, bool $isAdmin): void
    {
        self::ensureSynced();
        if (! self::isReady()) {
            return;
        }

        $roleName = $isAdmin ? self::ROLE_ADMIN : self::ROLE_CONTRIBUTOR;
        $legacyRole = $isAdmin ? User::ROLE_ADMIN : User::ROLE_USER;

        $user->syncRoles([$roleName]);

        if ($user->role !== $legacyRole) {
            $user->forceFill(['role' => $legacyRole])->saveQuietly();
        }
    }

    public static function syncUserFromLegacyRole(User $user): void
    {
        self::ensureSynced();
        if (! self::isReady()) {
            return;
        }

        $isAdmin = $user->role === User::ROLE_ADMIN;
        $roleName = $isAdmin ? self::ROLE_ADMIN : self::ROLE_CONTRIBUTOR;

        if (! $user->hasRole($roleName) || $user->roles()->count() !== 1) {
            $user->syncRoles([$roleName]);
        }
    }

    public static function isReady(): bool
    {
        return self::permissionTablesExist();
    }

    private static function permissionTablesExist(): bool
    {
        return Schema::hasTable(config('permission.table_names.roles', 'roles'))
            && Schema::hasTable(config('permission.table_names.permissions', 'permissions'))
            && Schema::hasTable(config('permission.table_names.model_has_roles', 'model_has_roles'))
            && Schema::hasTable(config('permission.table_names.role_has_permissions', 'role_has_permissions'));
    }
}
