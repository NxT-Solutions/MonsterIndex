<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AnalyticsEvent;
use App\Models\AnalyticsPageView;
use App\Models\Monitor;
use App\Models\MonitorRun;
use App\Models\Monster;
use App\Models\MonsterFollow;
use App\Models\MonsterSuggestion;
use App\Models\PriceSnapshot;
use App\Models\PushSubscription;
use App\Models\Site;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = now()->startOfDay();
        $operationsPeriodStart = $today->copy()->subDays(13);
        $analyticsPeriodStart = $today->copy()->subDays(29);

        $snapshotsByDay = PriceSnapshot::query()
            ->where('checked_at', '>=', $operationsPeriodStart)
            ->selectRaw('DATE(checked_at) as day')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed")
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $alertsByDay = Alert::query()
            ->where('created_at', '>=', $operationsPeriodStart)
            ->selectRaw('DATE(created_at) as day')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $pageViewsByDay = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->selectRaw('DATE(viewed_at) as day')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COUNT(DISTINCT visitor_id) as visitors')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $followsByDay = MonsterFollow::query()
            ->where('created_at', '>=', $analyticsPeriodStart)
            ->selectRaw('DATE(created_at) as day')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $contributorActionsByDay = $this->mergeCountRows(
            Monitor::query()
                ->where('created_at', '>=', $analyticsPeriodStart)
                ->whereNotNull('created_by_user_id')
                ->selectRaw('DATE(created_at) as day')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('day')
                ->orderBy('day')
                ->get(),
            MonsterSuggestion::query()
                ->where('created_at', '>=', $analyticsPeriodStart)
                ->selectRaw('DATE(created_at) as day')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('day')
                ->orderBy('day')
                ->get(),
        );

        $snapshotSeries = $this->buildDailySeries(
            $operationsPeriodStart,
            $today,
            $snapshotsByDay,
            totalField: 'total',
            secondaryField: 'failed',
        );
        $alertSeries = $this->buildDailySeries(
            $operationsPeriodStart,
            $today,
            $alertsByDay,
            totalField: 'total',
            secondaryField: null,
        );
        $trafficSeries = $this->buildDailySeries(
            $analyticsPeriodStart,
            $today,
            $pageViewsByDay,
            totalField: 'total',
            secondaryField: 'visitors',
        );
        $communitySeries = $this->buildDailySeries(
            $analyticsPeriodStart,
            $today,
            $this->pairDailyRows($followsByDay, $contributorActionsByDay),
            totalField: 'total',
            secondaryField: 'secondary',
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

        $pageViewsLast30d = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->count();
        $uniqueVisitorsLast30d = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->distinct()
            ->count('visitor_id');
        $sessionsLast30d = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->distinct()
            ->count('browser_session_id');
        $engagedViewsLast30d = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->whereNotNull('engaged_at')
            ->count();
        $repeatVisitorsLast30d = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->selectRaw('visitor_id')
            ->groupBy('visitor_id')
            ->havingRaw('COUNT(*) >= 2')
            ->get()
            ->count();
        $avgDurationSecondsLast30d = (int) round((float) (
            AnalyticsPageView::query()
                ->where('viewed_at', '>=', $analyticsPeriodStart)
                ->avg('duration_seconds') ?? 0
        ));
        $signedInViewsLast30d = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->where('is_authenticated', true)
            ->count();
        $guestViewsLast30d = max(0, $pageViewsLast30d - $signedInViewsLast30d);
        $activeSignedInUsersLast30d = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->whereNotNull('user_id')
            ->distinct()
            ->count('user_id');
        $guestVisitorsLast30d = AnalyticsPageView::query()
            ->where('viewed_at', '>=', $analyticsPeriodStart)
            ->whereNull('user_id')
            ->distinct()
            ->count('visitor_id');
        $pushEnabledUsers = PushSubscription::query()
            ->whereNotNull('user_id')
            ->distinct()
            ->count('user_id');

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'monsters_total' => Monster::query()->count(),
                'sites_total' => Site::query()->count(),
                'monitors_total' => $totalMonitors,
                'monitors_active' => Monitor::query()->where('active', true)->count(),
                'monitors_pending_review' => Monitor::query()
                    ->where('submission_status', Monitor::STATUS_PENDING_REVIEW)
                    ->count(),
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
                'monster_suggestions_pending' => MonsterSuggestion::query()
                    ->where('status', MonsterSuggestion::STATUS_PENDING)
                    ->count(),
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
            'analytics' => [
                'summary' => [
                    'page_views_30d' => $pageViewsLast30d,
                    'unique_visitors_30d' => $uniqueVisitorsLast30d,
                    'sessions_30d' => $sessionsLast30d,
                    'avg_duration_seconds_30d' => $avgDurationSecondsLast30d,
                    'engaged_visits_percent_30d' => $pageViewsLast30d > 0
                        ? (int) round(($engagedViewsLast30d / $pageViewsLast30d) * 100)
                        : 0,
                    'repeat_visitors_30d' => $repeatVisitorsLast30d,
                    'registered_users_total' => User::query()->count(),
                    'new_users_30d' => User::query()
                        ->where('created_at', '>=', $analyticsPeriodStart)
                        ->count(),
                    'active_signed_in_users_30d' => $activeSignedInUsersLast30d,
                    'push_enabled_users' => $pushEnabledUsers,
                    'signed_in_views_30d' => $signedInViewsLast30d,
                    'guest_views_30d' => $guestViewsLast30d,
                    'guest_visitors_30d' => $guestVisitorsLast30d,
                ],
                'traffic' => [
                    'daily_views' => $trafficSeries,
                    'channels' => $this->buildBreakdownRows(
                        AnalyticsPageView::query()
                            ->where('viewed_at', '>=', $analyticsPeriodStart)
                            ->selectRaw("COALESCE(channel, 'direct') as bucket")
                            ->selectRaw('COUNT(*) as total')
                            ->groupBy('bucket')
                            ->orderByDesc('total')
                            ->limit(6)
                            ->get(),
                        $pageViewsLast30d,
                    ),
                    'top_referrers' => $this->buildBreakdownRows(
                        AnalyticsPageView::query()
                            ->where('viewed_at', '>=', $analyticsPeriodStart)
                            ->whereNotNull('referrer_host')
                            ->where('referrer_host', '!=', '')
                            ->where('channel', '!=', 'internal')
                            ->selectRaw('referrer_host as bucket')
                            ->selectRaw('COUNT(*) as total')
                            ->groupBy('bucket')
                            ->orderByDesc('total')
                            ->limit(6)
                            ->get(),
                        $pageViewsLast30d,
                    ),
                    'recent_visits' => AnalyticsPageView::query()
                        ->with('user:id,name,email')
                        ->latest('viewed_at')
                        ->take(10)
                        ->get()
                        ->map(fn (AnalyticsPageView $view): array => [
                            'id' => $view->id,
                            'path' => $view->path,
                            'title' => $view->title ?: $this->fallbackPageTitle($view->path),
                            'page_kind' => $view->page_kind,
                            'channel' => $view->channel ?: 'direct',
                            'referrer_host' => $view->referrer_host,
                            'viewer_label' => $view->user?->name ?: 'Guest',
                            'viewer_email' => $view->user?->email,
                            'is_authenticated' => $view->is_authenticated,
                            'duration_seconds' => (int) $view->duration_seconds,
                            'viewed_at' => $view->viewed_at?->toIso8601String(),
                            'device_type' => $view->device_type ?: 'unknown',
                        ])
                        ->values(),
                ],
                'audience' => [
                    'devices' => $this->buildBreakdownRows(
                        AnalyticsPageView::query()
                            ->where('viewed_at', '>=', $analyticsPeriodStart)
                            ->selectRaw("COALESCE(device_type, 'unknown') as bucket")
                            ->selectRaw('COUNT(*) as total')
                            ->groupBy('bucket')
                            ->orderByDesc('total')
                            ->limit(5)
                            ->get(),
                        $pageViewsLast30d,
                    ),
                    'browsers' => $this->buildBreakdownRows(
                        AnalyticsPageView::query()
                            ->where('viewed_at', '>=', $analyticsPeriodStart)
                            ->selectRaw("COALESCE(browser_family, 'Unknown') as bucket")
                            ->selectRaw('COUNT(*) as total')
                            ->groupBy('bucket')
                            ->orderByDesc('total')
                            ->limit(6)
                            ->get(),
                        $pageViewsLast30d,
                    ),
                    'locales' => $this->buildBreakdownRows(
                        AnalyticsPageView::query()
                            ->where('viewed_at', '>=', $analyticsPeriodStart)
                            ->whereNotNull('locale')
                            ->selectRaw('locale as bucket')
                            ->selectRaw('COUNT(*) as total')
                            ->groupBy('bucket')
                            ->orderByDesc('total')
                            ->limit(6)
                            ->get(),
                        $pageViewsLast30d,
                    ),
                ],
                'behavior' => [
                    'community_daily' => $communitySeries,
                    'top_pages' => AnalyticsPageView::query()
                        ->where('viewed_at', '>=', $analyticsPeriodStart)
                        ->where('page_kind', '!=', 'admin')
                        ->selectRaw('path')
                        ->selectRaw("MAX(COALESCE(title, path)) as title")
                        ->selectRaw('COUNT(*) as views')
                        ->selectRaw('COUNT(DISTINCT visitor_id) as unique_visitors')
                        ->selectRaw('AVG(duration_seconds) as avg_duration_seconds')
                        ->selectRaw("SUM(CASE WHEN engaged_at IS NOT NULL THEN 1 ELSE 0 END) as engaged_views")
                        ->groupBy('path')
                        ->orderByDesc('views')
                        ->limit(8)
                        ->get()
                        ->map(fn ($row): array => [
                            'path' => (string) $row->path,
                            'title' => (string) ($row->title ?: $this->fallbackPageTitle((string) $row->path)),
                            'views' => (int) $row->views,
                            'unique_visitors' => (int) $row->unique_visitors,
                            'avg_duration_seconds' => (int) round((float) $row->avg_duration_seconds),
                            'engaged_percent' => (int) round(((int) $row->engaged_views / max(1, (int) $row->views)) * 100),
                        ])
                        ->values(),
                    'search_terms' => AnalyticsEvent::query()
                        ->where('occurred_at', '>=', $analyticsPeriodStart)
                        ->where('event_name', 'search')
                        ->whereNotNull('label')
                        ->where('label', '!=', '')
                        ->selectRaw('LOWER(label) as bucket')
                        ->selectRaw('COUNT(*) as total')
                        ->groupBy('bucket')
                        ->orderByDesc('total')
                        ->limit(8)
                        ->get()
                        ->map(fn ($row): array => [
                            'id' => (string) $row->bucket,
                            'label' => (string) $row->bucket,
                            'value' => (int) $row->total,
                            'hint' => 'searches',
                        ])
                        ->values(),
                    'outbound_domains' => $this->buildBreakdownRows(
                        AnalyticsEvent::query()
                            ->where('occurred_at', '>=', $analyticsPeriodStart)
                            ->where('event_name', 'outbound_click')
                            ->whereNotNull('target_host')
                            ->where('target_host', '!=', '')
                            ->selectRaw('target_host as bucket')
                            ->selectRaw('COUNT(*) as total')
                            ->groupBy('bucket')
                            ->orderByDesc('total')
                            ->limit(8)
                            ->get(),
                        AnalyticsEvent::query()
                            ->where('occurred_at', '>=', $analyticsPeriodStart)
                            ->where('event_name', 'outbound_click')
                            ->count(),
                    ),
                    'conversion' => [
                        'follows_30d' => MonsterFollow::query()
                            ->where('created_at', '>=', $analyticsPeriodStart)
                            ->count(),
                        'contributor_actions_30d' => Monitor::query()
                            ->where('created_at', '>=', $analyticsPeriodStart)
                            ->whereNotNull('created_by_user_id')
                            ->count() + MonsterSuggestion::query()
                            ->where('created_at', '>=', $analyticsPeriodStart)
                            ->count(),
                        'push_subscriptions_total' => PushSubscription::query()->count(),
                        'outbound_clicks_30d' => AnalyticsEvent::query()
                            ->where('occurred_at', '>=', $analyticsPeriodStart)
                            ->where('event_name', 'outbound_click')
                            ->count(),
                    ],
                ],
            ],
            'recentRuns' => $recentRuns,
            'pushTestUsers' => User::query()
                ->orderBy('name')
                ->limit(200)
                ->get(['id', 'name', 'email'])
                ->values(),
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

    /**
     * @param  Collection<int, object>  $primaryRows
     * @param  Collection<int, object>  $secondaryRows
     * @return Collection<int, object>
     */
    private function pairDailyRows(Collection $primaryRows, Collection $secondaryRows): Collection
    {
        $days = collect()
            ->merge($primaryRows->pluck('day'))
            ->merge($secondaryRows->pluck('day'))
            ->filter()
            ->unique()
            ->sort()
            ->values();

        $primary = $primaryRows->keyBy(fn ($row) => (string) ($row->day ?? ''));
        $secondary = $secondaryRows->keyBy(fn ($row) => (string) ($row->day ?? ''));

        return $days->map(function ($day) use ($primary, $secondary): object {
            $primaryRow = $primary->get((string) $day);
            $secondaryRow = $secondary->get((string) $day);

            return (object) [
                'day' => $day,
                'total' => (int) ($primaryRow->total ?? 0),
                'secondary' => (int) ($secondaryRow->total ?? 0),
            ];
        });
    }

    /**
     * @param  Collection<int, object>  ...$collections
     * @return Collection<int, object>
     */
    private function mergeCountRows(Collection ...$collections): Collection
    {
        $totals = [];

        foreach ($collections as $collection) {
            foreach ($collection as $row) {
                $day = (string) ($row->day ?? '');
                if ($day === '') {
                    continue;
                }

                $totals[$day] = ($totals[$day] ?? 0) + (int) ($row->total ?? 0);
            }
        }

        ksort($totals);

        return collect($totals)
            ->map(fn (int $total, string $day): object => (object) [
                'day' => $day,
                'total' => $total,
            ])
            ->values();
    }

    /**
     * @param  Collection<int, object>  $rows
     * @return array<int, array{id: string, label: string, value: int, hint: string}>
     */
    private function buildBreakdownRows(Collection $rows, int $overallTotal): array
    {
        return $rows
            ->map(function ($row) use ($overallTotal): array {
                $bucket = (string) ($row->bucket ?? '');
                $total = (int) ($row->total ?? 0);
                $percent = $overallTotal > 0
                    ? (int) round(($total / $overallTotal) * 100)
                    : 0;

                return [
                    'id' => $bucket !== '' ? $bucket : 'unknown',
                    'label' => $this->labelForBucket($bucket),
                    'value' => $total,
                    'hint' => $percent > 0 ? $percent.'% of total' : '0% of total',
                ];
            })
            ->values()
            ->all();
    }

    private function labelForBucket(string $bucket): string
    {
        if ($bucket === '') {
            return 'Unknown';
        }

        return match ($bucket) {
            'direct' => 'Direct',
            'internal' => 'Internal',
            'referral' => 'Referral',
            'search' => 'Search',
            'social' => 'Social',
            'email' => 'Email',
            'paid' => 'Paid',
            default => Str::headline(str_replace(['-', '_'], ' ', $bucket)),
        };
    }

    private function fallbackPageTitle(string $path): string
    {
        if ($path === '/') {
            return 'Homepage';
        }

        $trimmed = trim($path, '/');
        if ($trimmed === '') {
            return 'Homepage';
        }

        return Str::headline(str_replace('/', ' ', $trimmed));
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
