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
        $validated = $this->validatePayload($request);

        $monitor = Monitor::query()->create([
            ...$validated,
            'currency' => strtoupper($validated['currency']),
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
        $validated = $this->validatePayload($request, isUpdate: true);

        $monitor->fill([
            ...$validated,
            'currency' => strtoupper($validated['currency']),
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
    private function validatePayload(Request $request, bool $isUpdate = false): array
    {
        return $request->validate([
            'monster_id' => ['required', 'integer', Rule::exists('monsters', 'id')],
            'site_id' => ['required', 'integer', Rule::exists('sites', 'id')],
            'product_url' => ['required', 'url', 'max:2048'],
            'currency' => ['required', 'string', 'size:3'],
            'check_interval_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
            'active' => [$isUpdate ? 'required' : 'sometimes', 'boolean'],
        ]);
    }
}
