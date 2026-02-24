<?php

namespace Packages\Contributions\Services;

use App\Models\ContributorAlert;
use App\Models\MonsterFollow;
use App\Models\Monitor;
use App\Models\PriceSnapshot;

class ContributorAlertService
{
    private const PRICE_DROP_ALERT_TYPE = 'price_drop';

    private const ALERT_COOLDOWN_HOURS = 6;

    public function handleSnapshot(PriceSnapshot $snapshot, Monitor $monitor): void
    {
        if (! $monitor->canRunScheduledChecks()) {
            return;
        }

        if ($snapshot->status === 'failed' || $snapshot->effective_total_cents === null) {
            return;
        }

        $currency = (string) ($snapshot->currency ?: Monitor::DEFAULT_CURRENCY);
        if ($currency !== Monitor::DEFAULT_CURRENCY) {
            return;
        }

        $previousSnapshot = PriceSnapshot::query()
            ->select('price_snapshots.*')
            ->join('monitors', 'monitors.id', '=', 'price_snapshots.monitor_id')
            ->where('monitors.monster_id', $monitor->monster_id)
            ->where('monitors.submission_status', Monitor::STATUS_APPROVED)
            ->where('monitors.active', true)
            ->where('price_snapshots.id', '!=', $snapshot->id)
            ->where('price_snapshots.currency', $currency)
            ->whereNotNull('price_snapshots.effective_total_cents')
            ->where('price_snapshots.status', '!=', 'failed')
            ->where(function ($query) use ($snapshot): void {
                if ($snapshot->checked_at === null) {
                    $query->where('price_snapshots.id', '<', $snapshot->id);

                    return;
                }

                $query->where('price_snapshots.checked_at', '<', $snapshot->checked_at)
                    ->orWhere(function ($inner) use ($snapshot): void {
                        $inner->where('price_snapshots.checked_at', '=', $snapshot->checked_at)
                            ->where('price_snapshots.id', '<', $snapshot->id);
                    });
            })
            ->orderBy('price_snapshots.effective_total_cents')
            ->orderByDesc('price_snapshots.checked_at')
            ->orderByDesc('price_snapshots.id')
            ->first();

        if (! $previousSnapshot || $previousSnapshot->effective_total_cents === null) {
            return;
        }

        if ($snapshot->effective_total_cents >= $previousSnapshot->effective_total_cents) {
            return;
        }

        $eligibleFollows = MonsterFollow::query()
            ->where('monster_id', $monitor->monster_id)
            ->where('currency', $currency)
            ->where(function ($query): void {
                $query->whereNull('last_alerted_at')
                    ->orWhere('last_alerted_at', '<=', now()->subHours(self::ALERT_COOLDOWN_HOURS));
            })
            ->get();

        if ($eligibleFollows->isEmpty()) {
            return;
        }

        $createdForFollowIds = [];
        foreach ($eligibleFollows as $follow) {
            $alert = ContributorAlert::query()->firstOrCreate(
                [
                    'user_id' => (int) $follow->user_id,
                    'price_snapshot_id' => $snapshot->id,
                    'type' => self::PRICE_DROP_ALERT_TYPE,
                ],
                [
                    'monster_id' => $monitor->monster_id,
                    'monitor_id' => $monitor->id,
                    'currency' => $currency,
                    'effective_total_cents' => $snapshot->effective_total_cents,
                    'title' => sprintf(
                        'Price drop: %s now %s',
                        (string) $monitor->monster?->name,
                        $this->formatCents($snapshot->effective_total_cents, $currency),
                    ),
                    'body' => sprintf(
                        '%s dropped from %s to %s on %s.',
                        (string) $monitor->monster?->name,
                        $this->formatCents($previousSnapshot->effective_total_cents, $currency),
                        $this->formatCents($snapshot->effective_total_cents, $currency),
                        (string) $monitor->site?->name,
                    ),
                ],
            );

            if ($alert->wasRecentlyCreated) {
                $createdForFollowIds[] = (int) $follow->id;
            }
        }

        if ($createdForFollowIds !== []) {
            MonsterFollow::query()
                ->whereIn('id', $createdForFollowIds)
                ->update([
                    'last_alerted_at' => now(),
                ]);
        }
    }

    private function formatCents(int $cents, string $currency): string
    {
        return sprintf('%s %0.2f', $currency, $cents / 100);
    }
}
