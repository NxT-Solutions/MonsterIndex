<?php

namespace App\Policies;

use App\Models\Monitor;
use App\Models\User;

class MonitorPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('monitor.submit') || $user->can('monitors.manage.any');
    }

    public function view(User $user, Monitor $monitor): bool
    {
        if ($user->can('monitors.manage.any')) {
            return true;
        }

        return $user->can('monitor.view.own')
            && (int) $monitor->created_by_user_id === (int) $user->id;
    }

    public function create(User $user): bool
    {
        return $user->can('monitor.submit');
    }

    public function update(User $user, Monitor $monitor): bool
    {
        if ($user->can('monitors.manage.any')) {
            return true;
        }

        return $user->can('monitor.update.own')
            && (int) $monitor->created_by_user_id === (int) $user->id;
    }

    public function delete(User $user, Monitor $monitor): bool
    {
        if ($user->can('monitors.manage.any')) {
            return true;
        }

        return $user->can('monitor.delete.own')
            && (int) $monitor->created_by_user_id === (int) $user->id;
    }

    public function submitForReview(User $user, Monitor $monitor): bool
    {
        if ($user->can('monitors.manage.any')) {
            return true;
        }

        return $user->can('monitor.submit')
            && (int) $monitor->created_by_user_id === (int) $user->id;
    }

    public function approve(User $user, Monitor $monitor): bool
    {
        return $user->can('monitor.approve');
    }

    public function reject(User $user, Monitor $monitor): bool
    {
        return $user->can('monitor.reject');
    }

    public function forceApprove(User $user, Monitor $monitor): bool
    {
        return $user->can('monitor.force-approve');
    }
}
