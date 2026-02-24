<?php

namespace Packages\Contributions\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\MonsterFollow;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FollowedMonsterController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $follows = MonsterFollow::query()
            ->where('user_id', $user->id)
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

        return Inertia::render('Contribute/Follows/Index', [
            'follows' => $follows->map(function (MonsterFollow $follow) use ($bestPricesByMonsterId): array {
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
                    'last_alerted_at' => $follow->last_alerted_at?->toIso8601String(),
                    'created_at' => $follow->created_at?->toIso8601String(),
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
            })->values(),
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
