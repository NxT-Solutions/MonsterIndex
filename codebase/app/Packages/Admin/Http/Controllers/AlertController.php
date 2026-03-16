<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\MonsterFollow;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    public function index(Request $request): Response
    {
        $authUser = $request->user();
        $followedPriceDrops = collect();

        $followableMonsters = Monster::query()
            ->where('active', true)
            ->orderBy('name')
            ->limit(300)
            ->get(['id', 'name', 'slug', 'size_label'])
            ->map(fn (Monster $monster): array => [
                'id' => $monster->id,
                'slug' => $monster->slug,
                'name' => $monster->name,
                'size_label' => $monster->size_label,
                'label' => $monster->size_label
                    ? sprintf('%s (%s)', $monster->name, $monster->size_label)
                    : $monster->name,
            ])
            ->values();

        if ($authUser instanceof User) {
            $follows = MonsterFollow::query()
                ->where('user_id', $authUser->id)
                ->where('currency', Monitor::DEFAULT_CURRENCY)
                ->with(['monster:id,name,slug,size_label'])
                ->latest('updated_at')
                ->get();

            $bestPricesByMonsterId = BestPrice::query()
                ->whereIn('monster_id', $follows->pluck('monster_id')->all())
                ->where('currency', Monitor::DEFAULT_CURRENCY)
                ->with([
                    'snapshot:id,monitor_id,checked_at,effective_total_cents,can_count,price_per_can_cents,currency,status',
                    'snapshot.monitor:id,site_id,selector_config',
                    'snapshot.monitor.site:id,name,domain',
                ])
                ->get()
                ->keyBy('monster_id');

            $followedPriceDrops = $follows
                ->map(function (MonsterFollow $follow) use ($bestPricesByMonsterId): array {
                    $bestPrice = $bestPricesByMonsterId->get((int) $follow->monster_id);
                    $snapshot = $bestPrice?->snapshot;
                    $manualCanCount = $this->manualCanCountFromSelectorConfig(
                        $snapshot?->monitor?->selector_config,
                    );
                    $canCount = $snapshot?->can_count ?? $manualCanCount;
                    $assumedSingleCan = false;
                    if ($canCount === null || $canCount <= 0) {
                        $canCount = 1;
                        $assumedSingleCan = true;
                    }

                    $pricePerCanCents = $snapshot?->price_per_can_cents;
                    if ($pricePerCanCents === null && $bestPrice) {
                        $pricePerCanCents = (int) round($bestPrice->effective_total_cents / $canCount);
                    }

                    return [
                        'id' => $follow->id,
                        'currency' => $follow->currency,
                        'followed_at' => $follow->created_at?->toIso8601String(),
                        'last_alerted_at' => $follow->last_alerted_at?->toIso8601String(),
                        'monster' => [
                            'id' => $follow->monster?->id,
                            'name' => $follow->monster?->name,
                            'slug' => $follow->monster?->slug,
                            'size_label' => $follow->monster?->size_label,
                        ],
                        'best_offer' => $bestPrice ? [
                            'effective_total_cents' => $bestPrice->effective_total_cents,
                            'currency' => $bestPrice->currency,
                            'can_count' => $canCount,
                            'price_per_can_cents' => $pricePerCanCents,
                            'assumed_single_can' => $assumedSingleCan,
                            'checked_at' => $snapshot?->checked_at?->toIso8601String(),
                            'site' => $snapshot?->monitor?->site?->name,
                            'domain' => $snapshot?->monitor?->site?->domain,
                        ] : null,
                    ];
                })
                ->values();
        }

        return Inertia::render('Admin/Alerts/Index', [
            'alerts' => Alert::query()
                ->with([
                    'monster:id,name,slug',
                    'monitor:id,site_id',
                    'monitor.site:id,name',
                    'monitor.latestSnapshot' => fn ($query) => $query->select([
                        'price_snapshots.id',
                        'price_snapshots.monitor_id',
                        'price_snapshots.checked_at',
                        'price_snapshots.effective_total_cents',
                        'price_snapshots.price_per_can_cents',
                        'price_snapshots.can_count',
                        'price_snapshots.currency',
                        'price_snapshots.status',
                    ]),
                ])
                ->latest()
                ->paginate(50)
                ->withQueryString(),
            'followableMonsters' => $followableMonsters,
            'followedPriceDrops' => $followedPriceDrops,
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
                        (string) ($monitor->monster?->name ?: __('Unknown monster')),
                        (string) ($monitor->site?->name ?: __('Unknown store')),
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

        return back()->with('success', __('Alert marked as read.'));
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
                'monitor_id' => __('No approved active monitor available for test alert.'),
            ]);
        }

        $monsterName = (string) ($monitor->monster?->name ?: __('Monster'));
        $storeName = (string) ($monitor->site?->name ?: __('Store'));

        Alert::query()->create([
            'monster_id' => $monitor->monster_id,
            'monitor_id' => $monitor->id,
            'type' => 'manual_test',
            'title' => $validated['title'] ?? __('Manual test alert for :monster', ['monster' => $monsterName]),
            'body' => $validated['body'] ?? __('Manual test: :monster at :store. Triggered by :actor.', [
                'monster' => $monsterName,
                'store' => $storeName,
                'actor' => (string) ($request->user()?->email ?: __('admin')),
            ]),
        ]);

        return back()->with('success', __('Test alert created and push dispatch queued.'));
    }

    /**
     * @param  array<string, mixed>|null  $selectorConfig
     */
    private function manualCanCountFromSelectorConfig(?array $selectorConfig): ?int
    {
        if (! is_array($selectorConfig)) {
            return null;
        }

        $quantity = $selectorConfig['quantity'] ?? null;
        if (! is_array($quantity)) {
            return null;
        }

        $manual = $quantity['manual_value'] ?? null;
        if (! is_string($manual)) {
            return null;
        }

        if (preg_match('/\b(\d{1,4})\b/', $manual, $matches) !== 1) {
            return null;
        }

        $value = (int) ($matches[1] ?? 0);

        return $value > 0 ? $value : null;
    }
}
