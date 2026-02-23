<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use Packages\Monitoring\Jobs\CheckMonitorPriceJob;
use App\Models\Monitor;
use App\Models\MonitorRun;
use App\Models\Monster;
use App\Models\Site;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MonitorController extends Controller
{
    public function index(): Response
    {
        $monitors = Monitor::query()
            ->with(['monster:id,name,slug', 'site:id,name,domain', 'latestSnapshot'])
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

        $monitor = Monitor::query()->create([
            'monster_id' => $validated['monster_id'],
            'site_id' => $siteId,
            'product_url' => $validated['product_url'],
            'currency' => strtoupper($validated['currency']),
            'check_interval_minutes' => (int) $validated['check_interval_minutes'],
            'next_check_at' => now(),
            'active' => $validated['active'] ?? true,
        ]);

        if (! $monitor->next_check_at) {
            $monitor->scheduleNextCheck();
            $monitor->save();
        }

        return back()->with('success', 'Monitor created.');
    }

    public function update(Request $request, Monitor $monitor): RedirectResponse
    {
        $validated = $this->validateUpdatePayload($request);

        $monitor->fill([
            'monster_id' => $validated['monster_id'],
            'site_id' => $validated['site_id'],
            'product_url' => $validated['product_url'],
            'currency' => strtoupper($validated['currency']),
            'check_interval_minutes' => (int) $validated['check_interval_minutes'],
            'active' => $validated['active'],
        ]);

        if ($monitor->next_check_at === null) {
            $monitor->scheduleNextCheck();
        }

        $monitor->save();

        return back()->with('success', 'Monitor updated.');
    }

    public function destroy(Monitor $monitor): RedirectResponse
    {
        $monitor->delete();

        return back()->with('success', 'Monitor deleted.');
    }

    public function runNow(Monitor $monitor): JsonResponse
    {
        $run = MonitorRun::query()->create([
            'monitor_id' => $monitor->id,
            'started_at' => now(),
            'status' => 'queued',
            'attempt' => 1,
        ]);

        CheckMonitorPriceJob::dispatch($monitor->id, 'manual', $run->id);

        return response()->json([
            'ok' => true,
            'message' => 'Monitor run queued.',
            'monitor_run_id' => $run->id,
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
            'currency' => ['required', 'string', 'size:3'],
            'check_interval_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $createSite = (bool) ($validated['create_site'] ?? false);
        if (! $createSite && ! isset($validated['site_id'])) {
            throw ValidationException::withMessages([
                'site_id' => 'Please select a store or choose Other.',
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
            'currency' => ['required', 'string', 'size:3'],
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
                'product_url' => 'Could not resolve a domain from the provided product URL.',
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
}
