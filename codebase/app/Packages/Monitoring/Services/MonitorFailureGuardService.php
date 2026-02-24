<?php

namespace Packages\Monitoring\Services;

use App\Models\Alert;
use App\Models\ContributorAlert;
use App\Models\Monitor;
use App\Models\PriceSnapshot;

class MonitorFailureGuardService
{
    public const MAX_CONSECUTIVE_FAILURES = 5;

    public function handleFailedSnapshot(Monitor $monitor, PriceSnapshot $snapshot): bool
    {
        if ($snapshot->status !== 'failed' || ! $monitor->canRunScheduledChecks()) {
            return false;
        }

        if (! $this->hasReachedFailureThreshold((int) $monitor->id)) {
            return false;
        }

        $wasDeactivated = Monitor::query()
            ->whereKey($monitor->id)
            ->where('active', true)
            ->update([
                'active' => false,
                'next_check_at' => null,
                'review_note' => sprintf(
                    'Auto-disabled after %d consecutive failed checks.',
                    self::MAX_CONSECUTIVE_FAILURES,
                ),
            ]) === 1;

        if (! $wasDeactivated) {
            return false;
        }

        $monitor->refresh()->loadMissing('monster', 'site', 'creator');

        $this->notifyAdmins($monitor);
        $this->notifyOwner($monitor, $snapshot);

        return true;
    }

    private function hasReachedFailureThreshold(int $monitorId): bool
    {
        $latestStatuses = PriceSnapshot::query()
            ->where('monitor_id', $monitorId)
            ->orderByDesc('checked_at')
            ->orderByDesc('id')
            ->limit(self::MAX_CONSECUTIVE_FAILURES)
            ->pluck('status');

        if ($latestStatuses->count() < self::MAX_CONSECUTIVE_FAILURES) {
            return false;
        }

        return $latestStatuses->every(
            fn (string $status): bool => $status === 'failed',
        );
    }

    private function notifyAdmins(Monitor $monitor): void
    {
        $monsterName = (string) ($monitor->monster?->name ?: 'Monster');
        $storeName = (string) ($monitor->site?->name ?: 'Unknown store');

        Alert::query()->create([
            'monster_id' => $monitor->monster_id,
            'monitor_id' => $monitor->id,
            'type' => 'monitor_auto_removed',
            'title' => sprintf('Monitor disabled after repeated failures: %s', $monsterName),
            'body' => sprintf(
                'Monitor for %s at %s was disabled after %d consecutive failed fetch checks.',
                $monsterName,
                $storeName,
                self::MAX_CONSECUTIVE_FAILURES,
            ),
        ]);
    }

    private function notifyOwner(Monitor $monitor, PriceSnapshot $snapshot): void
    {
        $owner = $monitor->creator;
        if (! $owner) {
            return;
        }

        // Admin owners already receive the admin alert stream.
        if ($owner->can('admin.access')) {
            return;
        }

        $monsterName = (string) ($monitor->monster?->name ?: 'Monster');
        $storeName = (string) ($monitor->site?->name ?: 'Unknown store');
        $lastKnownTotal = $this->lastKnownEffectiveTotalForMonitor((int) $monitor->id) ?? 0;

        ContributorAlert::query()->firstOrCreate(
            [
                'user_id' => (int) $owner->id,
                'price_snapshot_id' => $snapshot->id,
                'type' => 'monitor_auto_removed',
            ],
            [
                'monster_id' => $monitor->monster_id,
                'monitor_id' => $monitor->id,
                'currency' => (string) ($monitor->currency ?: Monitor::DEFAULT_CURRENCY),
                'effective_total_cents' => $lastKnownTotal,
                'title' => sprintf('Monitor removed: %s (%s)', $monsterName, $storeName),
                'body' => sprintf(
                    'Your monitor for %s at %s was removed after %d failed fetch checks in a row.',
                    $monsterName,
                    $storeName,
                    self::MAX_CONSECUTIVE_FAILURES,
                ),
            ],
        );
    }

    private function lastKnownEffectiveTotalForMonitor(int $monitorId): ?int
    {
        $value = PriceSnapshot::query()
            ->where('monitor_id', $monitorId)
            ->where('status', '!=', 'failed')
            ->whereNotNull('effective_total_cents')
            ->orderByDesc('checked_at')
            ->orderByDesc('id')
            ->value('effective_total_cents');

        return is_numeric($value) ? (int) $value : null;
    }
}

