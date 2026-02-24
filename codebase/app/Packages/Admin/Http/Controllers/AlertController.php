<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Monitor;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Alerts/Index', [
            'alerts' => Alert::query()
                ->with(['monster:id,name,slug', 'monitor.site:id,name'])
                ->latest()
                ->paginate(50)
                ->withQueryString(),
            'testMonitors' => Monitor::query()
                ->with(['monster:id,name', 'site:id,name'])
                ->approved()
                ->where('active', true)
                ->latest('updated_at')
                ->limit(200)
                ->get(['id', 'monster_id', 'site_id'])
                ->map(fn (Monitor $monitor): array => [
                    'id' => $monitor->id,
                    'label' => sprintf(
                        '%s @ %s',
                        (string) ($monitor->monster?->name ?: 'Unknown monster'),
                        (string) ($monitor->site?->name ?: 'Unknown store'),
                    ),
                ])
                ->values(),
        ]);
    }

    public function markRead(Alert $alert): RedirectResponse
    {
        $alert->update([
            'read_at' => now(),
        ]);

        return back()->with('success', 'Alert marked as read.');
    }

    public function triggerTest(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'monitor_id' => ['nullable', 'integer', Rule::exists('monitors', 'id')],
            'title' => ['nullable', 'string', 'max:140'],
            'body' => ['nullable', 'string', 'max:500'],
        ]);

        $monitor = null;
        if (! empty($validated['monitor_id'])) {
            $monitor = Monitor::query()
                ->with(['monster:id,name', 'site:id,name'])
                ->approved()
                ->where('active', true)
                ->find((int) $validated['monitor_id']);
        }

        if (! $monitor) {
            $monitor = Monitor::query()
                ->with(['monster:id,name', 'site:id,name'])
                ->approved()
                ->where('active', true)
                ->latest('updated_at')
                ->first();
        }

        if (! $monitor) {
            return back()->withErrors([
                'monitor_id' => 'No approved active monitor available for test alert.',
            ]);
        }

        $monsterName = (string) ($monitor->monster?->name ?: 'Monster');
        $storeName = (string) ($monitor->site?->name ?: 'Store');

        Alert::query()->create([
            'monster_id' => $monitor->monster_id,
            'monitor_id' => $monitor->id,
            'type' => 'manual_test',
            'title' => $validated['title'] ?? sprintf('Manual test alert for %s', $monsterName),
            'body' => $validated['body'] ?? sprintf(
                'Manual test: %s at %s. Triggered by %s.',
                $monsterName,
                $storeName,
                (string) ($request->user()?->email ?: 'admin'),
            ),
        ]);

        return back()->with('success', 'Test alert created and push dispatch queued.');
    }
}
