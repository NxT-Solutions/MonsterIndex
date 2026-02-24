<?php

namespace Packages\PublicBoard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\MonsterFollow;
use App\Models\PriceSnapshot;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonsterController extends Controller
{
    public function show(Request $request, Monster $monster): Response
    {
        $snapshots = PriceSnapshot::query()
            ->whereHas('monitor', fn ($query) => $query
                ->where('monster_id', $monster->id)
                ->where('submission_status', Monitor::STATUS_APPROVED)
                ->where('active', true))
            ->with(['monitor:id,site_id,product_url,selector_config', 'monitor.site:id,name,domain'])
            ->latest('checked_at')
            ->limit(200)
            ->get()
            ->map(function (PriceSnapshot $snapshot): array {
                $manualCanCount = $this->manualCanCountFromSelectorConfig(
                    $snapshot->monitor->selector_config,
                );
                $canCount = $snapshot->can_count ?? $manualCanCount;
                $pricePerCanCents = $snapshot->price_per_can_cents;
                if ($pricePerCanCents === null && $snapshot->effective_total_cents !== null && $canCount !== null && $canCount > 0) {
                    $pricePerCanCents = (int) round($snapshot->effective_total_cents / $canCount);
                }

                return [
                    'id' => $snapshot->id,
                    'checked_at' => $snapshot->checked_at?->toIso8601String(),
                    'price_cents' => $snapshot->price_cents,
                    'shipping_cents' => $snapshot->shipping_cents,
                    'effective_total_cents' => $snapshot->effective_total_cents,
                    'can_count' => $canCount,
                    'price_per_can_cents' => $pricePerCanCents,
                    'currency' => $snapshot->currency,
                    'status' => $snapshot->status,
                    'error_code' => $snapshot->error_code,
                    'site' => [
                        'name' => $snapshot->monitor->site->name,
                        'domain' => $snapshot->monitor->site->domain,
                        'product_url' => $snapshot->monitor->product_url,
                    ],
                ];
            })
            ->values();

        $availableCurrencies = $snapshots
            ->pluck('currency')
            ->filter(fn ($currency): bool => is_string($currency) && $currency !== '')
            ->unique()
            ->values();

        $followedCurrencies = collect();
        $authUser = $request->user();
        if ($authUser && $authUser->can('monster.follow')) {
            $followedCurrencies = MonsterFollow::query()
                ->where('user_id', $authUser->id)
                ->where('monster_id', $monster->id)
                ->pluck('currency')
                ->filter(fn ($currency): bool => is_string($currency) && $currency !== '')
                ->unique()
                ->values();
        }

        return Inertia::render('Monsters/Show', [
            'monster' => $monster,
            'snapshots' => $snapshots,
            'available_currencies' => $availableCurrencies,
            'followed_currencies' => $followedCurrencies,
        ]);
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
