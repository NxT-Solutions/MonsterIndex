<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Models\MonitorRun;
use App\Models\Monster;
use App\Models\Site;
use App\Support\UrlCanonicalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Packages\Monitoring\Jobs\CheckMonitorPriceJob;
use Packages\Monitoring\Services\BestPriceProjector;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MonitorController extends Controller
{
    private const QUEUED_STALE_MINUTES = 15;

    private const RUNNING_STALE_MINUTES = 20;

    public function __construct(
        private readonly BestPriceProjector $bestPriceProjector,
    ) {}

    public function index(): Response
    {
        $this->closeStaleRuns();

        $monitors = Monitor::query()
            ->with([
                'monster:id,name,slug',
                'site:id,name,domain',
                'latestSnapshot',
                'latestRun',
            ])
            ->orderByDesc('id')
            ->get();

        return Inertia::render('Admin/Monitors/Index', [
            'monitors' => $monitors,
            'monsters' => Monster::query()->where('active', true)->orderBy('name')->get(['id', 'name']),
            'sites' => Site::query()->where('active', true)->orderBy('name')->get(['id', 'name', 'domain']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateStorePayload($request);
        $siteId = $this->resolveStoreId($validated);
        $canonicalProductUrl = UrlCanonicalizer::canonicalize($validated['product_url']);
        if (! $canonicalProductUrl) {
            throw ValidationException::withMessages([
                'product_url' => __('Could not normalize the product URL.'),
            ]);
        }

        $monitor = Monitor::query()->create([
            'monster_id' => $validated['monster_id'],
            'site_id' => $siteId,
            'created_by_user_id' => $request->user()?->id,
            'approved_by_user_id' => $request->user()?->id,
            'product_url' => $validated['product_url'],
            'canonical_product_url' => $canonicalProductUrl,
            'currency' => Monitor::DEFAULT_CURRENCY,
            'check_interval_minutes' => (int) ($validated['check_interval_minutes'] ?? 60),
            'next_check_at' => now(),
            'active' => $validated['active'] ?? true,
            'submission_status' => Monitor::STATUS_APPROVED,
            'approved_at' => now(),
            'validation_status' => Monitor::VALIDATION_SUCCESS,
            'validation_checked_at' => now(),
            'validation_result' => ['status' => 'admin_seeded'],
        ]);

        if (! $monitor->next_check_at) {
            $monitor->scheduleNextCheck();
            $monitor->save();
        }

        if ($monitor->canRunScheduledChecks()) {
            $this->queueImmediateRun($monitor, 'admin-create');
        }

        return back()->with('success', __('Monitor created.'));
    }

    public function update(Request $request, Monitor $monitor): RedirectResponse
    {
        $oldMonsterId = (int) $monitor->monster_id;
        $oldCurrency = (string) $monitor->currency;
        $wasPubliclyVisible = $monitor->canRunScheduledChecks();

        $validated = $this->validateUpdatePayload($request);
        $canonicalProductUrl = UrlCanonicalizer::canonicalize($validated['product_url']);
        if (! $canonicalProductUrl) {
            throw ValidationException::withMessages([
                'product_url' => __('Could not normalize the product URL.'),
            ]);
        }

        $monitor->fill([
            'monster_id' => $validated['monster_id'],
            'site_id' => $validated['site_id'],
            'product_url' => $validated['product_url'],
            'canonical_product_url' => $canonicalProductUrl,
            'currency' => Monitor::DEFAULT_CURRENCY,
            'check_interval_minutes' => (int) $validated['check_interval_minutes'],
            'active' => $validated['active'],
            'submission_status' => Monitor::STATUS_APPROVED,
        ]);

        if ($monitor->next_check_at === null) {
            $monitor->scheduleNextCheck();
        }

        $monitor->save();

        if ($wasPubliclyVisible && (! $monitor->canRunScheduledChecks() || $oldMonsterId !== (int) $monitor->monster_id || $oldCurrency !== (string) $monitor->currency)) {
            $this->bestPriceProjector->recomputeForMonsterCurrency($oldMonsterId, $oldCurrency);
        }
        if ($monitor->canRunScheduledChecks()) {
            $this->bestPriceProjector->recomputeForMonsterCurrency((int) $monitor->monster_id, (string) $monitor->currency);
        }
        if (! $wasPubliclyVisible && $monitor->canRunScheduledChecks()) {
            $this->queueImmediateRun($monitor, 'admin-update-activated');
        }

        return back()->with('success', __('Monitor updated.'));
    }

    public function destroy(Monitor $monitor): RedirectResponse
    {
        $wasPubliclyVisible = $monitor->canRunScheduledChecks();
        $monsterId = (int) $monitor->monster_id;
        $currency = (string) $monitor->currency;
        $monitor->delete();

        if ($wasPubliclyVisible) {
            $this->bestPriceProjector->recomputeForMonsterCurrency($monsterId, $currency);
        }

        return back()->with('success', __('Monitor deleted.'));
    }

    public function runNow(Monitor $monitor): JsonResponse
    {
        if (! $monitor->canRunScheduledChecks()) {
            return response()->json([
                'ok' => false,
                'message' => __('Only approved and active monitors can be executed.'),
            ], 422);
        }

        $existingRun = $this->latestInFlightRun((int) $monitor->id);
        if ($existingRun) {
            return response()->json([
                'ok' => true,
                'message' => __('Monitor run already queued.'),
                'monitor_run_id' => $existingRun->id,
            ]);
        }

        $run = MonitorRun::query()->create([
            'monitor_id' => $monitor->id,
            'started_at' => now(),
            'status' => 'queued',
            'attempt' => 1,
        ]);

        CheckMonitorPriceJob::dispatch($monitor->id, 'manual', $run->id);

        return response()->json([
            'ok' => true,
            'message' => __('Monitor run queued.'),
            'monitor_run_id' => $run->id,
        ]);
    }

    public function events(Request $request): StreamedResponse
    {
        $monitorIds = Monitor::query()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $singlePass = $request->boolean('once');

        return response()->stream(function () use ($monitorIds, $singlePass): void {
            $startedAt = microtime(true);
            $lastSentAt = 0.0;
            $lastRunningIds = null;

            while (! connection_aborted() && (microtime(true) - $startedAt) < 25) {
                $runningMonitorIds = $this->resolveRunningMonitorIds($monitorIds);
                $shouldSend = $lastRunningIds === null
                    || $runningMonitorIds !== $lastRunningIds
                    || (microtime(true) - $lastSentAt) >= 8;

                if ($shouldSend) {
                    $payload = [
                        'running_monitor_ids' => $runningMonitorIds,
                        'timestamp' => now()->toIso8601String(),
                    ];

                    echo "event: monitor-runs\n";
                    echo 'data: '.json_encode($payload, JSON_THROW_ON_ERROR)."\n\n";

                    @ob_flush();
                    @flush();

                    $lastRunningIds = $runningMonitorIds;
                    $lastSentAt = microtime(true);

                    if ($singlePass) {
                        break;
                    }
                }

                usleep(1000000);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateStorePayload(Request $request): array
    {
        $validated = $request->validate([
            'monster_id' => ['required', 'integer', Rule::exists('monsters', 'id')],
            'site_id' => ['nullable', 'integer', Rule::exists('sites', 'id')],
            'create_site' => ['sometimes', 'boolean'],
            'site_name' => ['nullable', 'string', 'max:255'],
            'product_url' => ['required', 'url', 'max:2048'],
            'check_interval_minutes' => ['nullable', 'integer', 'min:15', 'max:1440'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $createSite = (bool) ($validated['create_site'] ?? false);
        if (! $createSite && ! isset($validated['site_id'])) {
            throw ValidationException::withMessages([
                'site_id' => __('Please select a store or choose Other.'),
            ]);
        }

        return $validated;
    }

    /**
     * @return array<string, mixed>
     */
    private function validateUpdatePayload(Request $request): array
    {
        return $request->validate([
            'monster_id' => ['required', 'integer', Rule::exists('monsters', 'id')],
            'site_id' => ['required', 'integer', Rule::exists('sites', 'id')],
            'product_url' => ['required', 'url', 'max:2048'],
            'check_interval_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
            'active' => ['required', 'boolean'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveStoreId(array $validated): int
    {
        if (isset($validated['site_id']) && is_int($validated['site_id'])) {
            return $validated['site_id'];
        }

        $domain = strtolower((string) parse_url((string) $validated['product_url'], PHP_URL_HOST));
        if ($domain === '') {
            throw ValidationException::withMessages([
                'product_url' => __('Could not resolve a domain from the provided product URL.'),
            ]);
        }

        $customName = trim((string) ($validated['site_name'] ?? ''));
        $siteName = $customName !== '' ? $customName : $this->guessSiteNameFromDomain($domain);

        $site = Site::query()->firstOrCreate(
            ['domain' => $domain],
            [
                'name' => $siteName,
                'active' => true,
            ],
        );

        if ($customName !== '' && $site->name !== $customName) {
            $site->forceFill(['name' => $customName])->save();
        }

        return (int) $site->id;
    }

    private function guessSiteNameFromDomain(string $domain): string
    {
        $name = str($domain)
            ->replace(['www.', '.com', '.nl', '.eu', '.be', '.de', '.fr', '.co.uk'], '')
            ->headline()
            ->toString();

        return $name !== '' ? $name : $domain;
    }

    private function queueImmediateRun(Monitor $monitor, string $triggeredBy): void
    {
        $existingRun = $this->latestInFlightRun((int) $monitor->id);
        if ($existingRun) {
            return;
        }

        $run = MonitorRun::query()->create([
            'monitor_id' => $monitor->id,
            'started_at' => now(),
            'status' => 'queued',
            'attempt' => 1,
        ]);

        CheckMonitorPriceJob::dispatch($monitor->id, $triggeredBy, $run->id);
    }

    /**
     * @param  list<int>  $monitorIds
     * @return list<int>
     */
    private function resolveRunningMonitorIds(array $monitorIds): array
    {
        if ($monitorIds === []) {
            return [];
        }

        $this->closeStaleRuns($monitorIds);

        return MonitorRun::query()
            ->whereIn('monitor_id', $monitorIds)
            ->where('status', 'running')
            ->whereNull('finished_at')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('monitor_runs as newer_runs')
                    ->whereColumn('newer_runs.monitor_id', 'monitor_runs.monitor_id')
                    ->whereColumn('newer_runs.id', '>', 'monitor_runs.id');
            })
            ->pluck('monitor_runs.monitor_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @param  list<int>|null  $monitorIds
     */
    private function closeStaleRuns(?array $monitorIds = null): void
    {
        $now = now();

        MonitorRun::query()
            ->when($monitorIds !== null && $monitorIds !== [], function ($query) use ($monitorIds): void {
                $query->whereIn('monitor_id', $monitorIds);
            })
            ->where('status', 'queued')
            ->whereNull('finished_at')
            ->where('started_at', '<=', $now->copy()->subMinutes(self::QUEUED_STALE_MINUTES))
            ->update([
                'status' => 'skipped',
                'finished_at' => $now,
                'error_message' => 'Auto-closed: queue job never started.',
            ]);

        MonitorRun::query()
            ->when($monitorIds !== null && $monitorIds !== [], function ($query) use ($monitorIds): void {
                $query->whereIn('monitor_id', $monitorIds);
            })
            ->where('status', 'running')
            ->whereNull('finished_at')
            ->where('started_at', '<=', $now->copy()->subMinutes(self::RUNNING_STALE_MINUTES))
            ->update([
                'status' => 'error',
                'finished_at' => $now,
                'error_message' => 'Auto-closed: run exceeded expected timeout.',
            ]);
    }

    private function latestInFlightRun(int $monitorId): ?MonitorRun
    {
        return MonitorRun::query()
            ->where('monitor_id', $monitorId)
            ->whereIn('status', ['queued', 'running'])
            ->whereNull('finished_at')
            ->latest('id')
            ->first();
    }
}
