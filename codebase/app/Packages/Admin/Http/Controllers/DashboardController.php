<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Monitor;
use App\Models\MonitorRun;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use App\Models\Site;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = now()->startOfDay();
        $periodStart = $today->copy()->subDays(13);

        $snapshotsByDay = PriceSnapshot::query()
            ->where('checked_at', '>=', $periodStart)
            ->selectRaw('DATE(checked_at) as day')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed")
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $alertsByDay = Alert::query()
            ->where('created_at', '>=', $periodStart)
            ->selectRaw('DATE(created_at) as day')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $snapshotSeries = $this->buildDailySeries(
            $periodStart,
            $today,
            $snapshotsByDay,
            totalField: 'total',
            secondaryField: 'failed',
        );
        $alertSeries = $this->buildDailySeries(
            $periodStart,
            $today,
            $alertsByDay,
            totalField: 'total',
            secondaryField: null,
        );

        $totalMonitors = Monitor::query()->count();
        $monitorsWithSelector = Monitor::query()
            ->get(['id', 'selector_config'])
            ->filter(fn (Monitor $monitor): bool => $this->hasPriceSelector($monitor))
            ->count();

        $snapshots24h = PriceSnapshot::query()
            ->where('checked_at', '>=', now()->subDay())
            ->count();
        $failedSnapshots24h = PriceSnapshot::query()
            ->where('checked_at', '>=', now()->subDay())
            ->where('status', 'failed')
            ->count();

        $recentRuns = MonitorRun::query()
            ->with([
                'monitor:id,monster_id,site_id',
                'monitor.monster:id,name',
                'monitor.site:id,name,domain',
            ])
            ->latest('started_at')
            ->take(8)
            ->get()
            ->map(function (MonitorRun $run): array {
                return [
                    'id' => $run->id,
                    'status' => $run->status,
                    'started_at' => $run->started_at?->toIso8601String(),
                    'finished_at' => $run->finished_at?->toIso8601String(),
                    'monitor' => [
                        'id' => $run->monitor_id,
                        'monster' => $run->monitor?->monster?->name,
                        'site' => $run->monitor?->site?->name,
                        'domain' => $run->monitor?->site?->domain,
                    ],
                ];
            })
            ->values();

        $topDomains = Site::query()
            ->withCount('monitors')
            ->orderByDesc('monitors_count')
            ->orderBy('name')
            ->take(6)
            ->get(['id', 'name', 'domain'])
            ->map(fn (Site $site): array => [
                'id' => $site->id,
                'name' => $site->name,
                'domain' => $site->domain,
                'monitors_count' => (int) $site->monitors_count,
            ])
            ->values();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'monsters_total' => Monster::query()->count(),
                'sites_total' => Site::query()->count(),
                'monitors_total' => $totalMonitors,
                'monitors_active' => Monitor::query()->where('active', true)->count(),
                'monitors_with_selector' => $monitorsWithSelector,
                'selector_coverage_percent' => $totalMonitors > 0
                    ? (int) round(($monitorsWithSelector / $totalMonitors) * 100)
                    : 0,
                'snapshots_24h' => $snapshots24h,
                'snapshots_failed_24h' => $failedSnapshots24h,
                'snapshot_success_percent_24h' => $snapshots24h > 0
                    ? (int) round((($snapshots24h - $failedSnapshots24h) / $snapshots24h) * 100)
                    : 0,
                'alerts_unread' => Alert::query()->whereNull('read_at')->count(),
                'running_runs' => MonitorRun::query()
                    ->whereIn('status', ['queued', 'running'])
                    ->whereNull('finished_at')
                    ->count(),
            ],
            'charts' => [
                'snapshots_daily' => $snapshotSeries,
                'alerts_daily' => $alertSeries,
                'top_domains' => $topDomains,
            ],
            'recentRuns' => $recentRuns,
        ]);
    }

    /**
     * @param  Collection<int, object>  $rows
     * @return array<int, array<string, int|string>>
     */
    private function buildDailySeries(
        Carbon $start,
        Carbon $end,
        Collection $rows,
        string $totalField,
        ?string $secondaryField,
    ): array {
        $indexed = $rows->keyBy(fn ($row) => (string) ($row->day ?? ''));
        $cursor = $start->copy();
        $series = [];

        while ($cursor->lessThanOrEqualTo($end)) {
            $key = $cursor->toDateString();
            $row = $indexed->get($key);

            $point = [
                'date' => $key,
                'label' => $cursor->format('M d'),
                'value' => (int) ($row->{$totalField} ?? 0),
            ];

            if ($secondaryField !== null) {
                $point['secondary'] = (int) ($row->{$secondaryField} ?? 0);
            }

            $series[] = $point;
            $cursor->addDay();
        }

        return $series;
    }

    private function hasPriceSelector(Monitor $monitor): bool
    {
        $selectorConfig = $monitor->selector_config;
        if (! is_array($selectorConfig)) {
            return false;
        }

        $price = $selectorConfig['price'] ?? null;
        if (! is_array($price)) {
            return false;
        }

        if (trim((string) ($price['css'] ?? '')) !== '') {
            return true;
        }

        if (trim((string) ($price['xpath'] ?? '')) !== '') {
            return true;
        }

        $parts = $price['parts'] ?? null;
        if (! is_array($parts)) {
            return false;
        }

        foreach ($parts as $part) {
            if (! is_array($part)) {
                continue;
            }

            if (trim((string) ($part['css'] ?? '')) !== '' || trim((string) ($part['xpath'] ?? '')) !== '') {
                return true;
            }
        }

        return false;
    }
}
