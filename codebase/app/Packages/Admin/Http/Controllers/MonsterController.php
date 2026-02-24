<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Models\MonitorRun;
use App\Models\Monster;
use App\Models\Site;
use App\Support\UrlCanonicalizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MonsterController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Monsters/Index', [
            'monsters' => Monster::query()
                ->orderBy('name')
                ->withCount('monitors')
                ->get(['id', 'name', 'slug', 'size_label', 'active']),
        ]);
    }

    public function show(Monster $monster): Response
    {
        $monster->load([
            'monitors' => fn ($query) => $query
                ->with(['site:id,name,domain', 'latestSnapshot', 'latestRun'])
                ->orderByDesc('id'),
        ]);

        return Inertia::render('Admin/Monsters/Show', [
            'monster' => $monster,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:monsters,slug'],
            'size_label' => ['nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
        ]);

        Monster::query()->create([
            'name' => $validated['name'],
            'slug' => $this->resolveUniqueSlug(
                baseSlug: $validated['slug'] ?? str($validated['name'])->slug()->toString(),
            ),
            'size_label' => $validated['size_label'] ?? null,
            'active' => $validated['active'] ?? true,
        ]);

        return back()->with('success', 'Monster created.');
    }

    public function update(Request $request, Monster $monster): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('monsters', 'slug')->ignore($monster->id)],
            'size_label' => ['nullable', 'string', 'max:255'],
            'active' => ['required', 'boolean'],
        ]);

        $monster->update([
            'name' => $validated['name'],
            'slug' => $this->resolveUniqueSlug(
                baseSlug: $validated['slug'] ?? str($validated['name'])->slug()->toString(),
                ignoreId: $monster->id,
            ),
            'size_label' => $validated['size_label'] ?? null,
            'active' => $validated['active'],
        ]);

        return back()->with('success', 'Monster updated.');
    }

    public function destroy(Monster $monster): RedirectResponse
    {
        if ($monster->monitors()->exists()) {
            throw ValidationException::withMessages([
                'monster' => 'Cannot delete a monster that still has monitors.',
            ]);
        }

        $monster->delete();

        return back()->with('success', 'Monster deleted.');
    }

    public function storeRecord(Request $request, Monster $monster): RedirectResponse
    {
        $validated = $request->validate([
            'site_name' => ['nullable', 'string', 'max:255'],
            'product_url' => ['required', 'url', 'max:2048'],
            'currency' => ['nullable', 'string', 'size:3'],
            'check_interval_minutes' => ['nullable', 'integer', 'min:15', 'max:1440'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $domain = strtolower((string) parse_url($validated['product_url'], PHP_URL_HOST));
        if ($domain === '') {
            throw ValidationException::withMessages([
                'product_url' => 'Could not resolve a domain from the provided product URL.',
            ]);
        }

        $siteName = trim((string) ($validated['site_name'] ?? ''));
        if ($siteName === '') {
            $siteName = str($domain)->replace(['www.', '.com', '.nl', '.eu', '.be', '.de', '.fr', '.co.uk'], '')->headline()->toString();
            if ($siteName === '') {
                $siteName = $domain;
            }
        }

        $site = Site::query()->firstOrCreate(
            ['domain' => $domain],
            [
                'name' => $siteName,
                'active' => true,
            ],
        );

        if ($site->name === $site->domain && $siteName !== '') {
            $site->forceFill([
                'name' => $siteName,
            ])->save();
        }

        $monitor = Monitor::query()->create([
            'monster_id' => $monster->id,
            'site_id' => $site->id,
            'created_by_user_id' => $request->user()?->id,
            'approved_by_user_id' => $request->user()?->id,
            'product_url' => $validated['product_url'],
            'canonical_product_url' => UrlCanonicalizer::canonicalize($validated['product_url']),
            'selector_config' => null,
            'currency' => strtoupper((string) ($validated['currency'] ?? 'EUR')),
            'check_interval_minutes' => (int) ($validated['check_interval_minutes'] ?? 60),
            'next_check_at' => now(),
            'active' => $validated['active'] ?? true,
            'submission_status' => Monitor::STATUS_APPROVED,
            'approved_at' => now(),
            'validation_status' => Monitor::VALIDATION_PENDING,
        ]);

        if (! $monitor->next_check_at) {
            $monitor->scheduleNextCheck();
            $monitor->save();
        }

        return redirect()
            ->route('admin.monsters.show', $monster->slug)
            ->with('success', 'Site record added. Open selector to configure price fields.');
    }

    public function recordsEvents(Request $request, Monster $monster): StreamedResponse
    {
        $monitorIds = $monster->monitors()->pluck('id')
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
     * @param  list<int>  $monitorIds
     * @return list<int>
     */
    private function resolveRunningMonitorIds(array $monitorIds): array
    {
        if ($monitorIds === []) {
            return [];
        }

        return MonitorRun::query()
            ->whereIn('monitor_id', $monitorIds)
            ->whereIn('status', ['queued', 'running'])
            ->whereNull('finished_at')
            ->pluck('monitor_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function resolveUniqueSlug(string $baseSlug, ?int $ignoreId = null): string
    {
        $slug = str($baseSlug)->slug()->toString();
        if ($slug === '') {
            $slug = 'monster';
        }

        $candidate = $slug;
        $suffix = 2;

        while (Monster::query()
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where('slug', $candidate)
            ->exists()) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
