<?php

namespace Packages\PublicBoard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BestPrice;
use App\Models\Monitor;
use App\Models\MonsterFollow;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(Request $request): Response
    {
        $bestPrices = BestPrice::query()
            ->whereHas('snapshot.monitor', function ($query): void {
                $query->where('submission_status', Monitor::STATUS_APPROVED)
                    ->where('active', true);
            })
            ->with([
                'monster:id,name,slug,size_label',
                'snapshot:id,monitor_id,checked_at,price_cents,shipping_cents,effective_total_cents,can_count,price_per_can_cents,currency,status',
                'snapshot.monitor:id,site_id,selector_config',
                'snapshot.monitor.site:id,name,domain',
            ])
            ->orderBy('effective_total_cents')
            ->get()
            ->map(fn (BestPrice $bestPrice): array => $this->mapBestPrice($bestPrice))
            ->values();

        $followedMonsterIds = collect();
        $authUser = $request->user();
        if ($authUser && $authUser->can('monster.follow')) {
            $monsterIds = $bestPrices
                ->pluck('monster.id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            if ($monsterIds->isNotEmpty()) {
                $followedMonsterIds = MonsterFollow::query()
                    ->where('user_id', $authUser->id)
                    ->where('currency', Monitor::DEFAULT_CURRENCY)
                    ->whereIn('monster_id', $monsterIds->all())
                    ->pluck('monster_id')
                    ->map(fn ($id): int => (int) $id)
                    ->flip();
            }
        }

        $bestPrices = $bestPrices
            ->map(function (array $row) use ($followedMonsterIds): array {
                $monsterId = (int) ($row['monster']['id'] ?? 0);

                return [
                    ...$row,
                    'is_following' => $monsterId > 0 && $followedMonsterIds->has($monsterId),
                ];
            })
            ->values();

        $trendingTracks = $bestPrices
            ->map(function (array $row): array {
                $checkedAt = $row['checked_at'];
                $checkedTimestamp = is_string($checkedAt)
                    ? Carbon::parse($checkedAt)->timestamp
                    : 0;

                return [
                    ...$row,
                    '_fresh_priority' => $this->isFreshSnapshot($checkedAt) ? 0 : 1,
                    '_effective_per_can_cents' => $this->effectivePerCanCents($row),
                    '_checked_timestamp' => $checkedTimestamp,
                ];
            })
            ->sort(function (array $left, array $right): int {
                if ($left['_fresh_priority'] !== $right['_fresh_priority']) {
                    return $left['_fresh_priority'] <=> $right['_fresh_priority'];
                }

                if ($left['_effective_per_can_cents'] !== $right['_effective_per_can_cents']) {
                    return $left['_effective_per_can_cents'] <=> $right['_effective_per_can_cents'];
                }

                if ($left['_checked_timestamp'] !== $right['_checked_timestamp']) {
                    return $right['_checked_timestamp'] <=> $left['_checked_timestamp'];
                }

                return strcmp(
                    (string) ($left['monster']['name'] ?? ''),
                    (string) ($right['monster']['name'] ?? ''),
                );
            })
            ->take(6)
            ->map(function (array $row): array {
                return [
                    'id' => $row['id'],
                    'monster' => $row['monster'],
                    'site' => $row['site'],
                    'domain' => $row['domain'],
                    'currency' => $row['currency'],
                    'effective_total_cents' => $row['effective_total_cents'],
                    'can_count' => $row['can_count'],
                    'price_per_can_cents' => $row['price_per_can_cents'],
                    'checked_at' => $row['checked_at'],
                    'detail_url' => $row['detail_url'],
                ];
            })
            ->values();

        return Inertia::render('Public/BestPricesIndex', [
            'bestPrices' => $bestPrices,
            'trendingTracks' => $trendingTracks,
            'stats' => [
                'tracked_monsters' => $bestPrices->unique(fn ($row) => $row['monster']['slug'])->count(),
                'offers' => $bestPrices->count(),
            ],
        ]);
    }

    private function mapBestPrice(BestPrice $bestPrice): array
    {
        $snapshot = $bestPrice->snapshot;
        $site = $snapshot?->monitor?->site;
        $manualCanCount = $this->manualCanCountFromSelectorConfig(
            $snapshot?->monitor?->selector_config,
        );
        $canCount = $snapshot?->can_count ?? $manualCanCount;
        $pricePerCanCents = $snapshot?->price_per_can_cents;
        if ($pricePerCanCents === null && $canCount !== null && $canCount > 0) {
            $pricePerCanCents = (int) round($bestPrice->effective_total_cents / $canCount);
        }

        return [
            'id' => $bestPrice->id,
            'monster' => [
                'id' => $bestPrice->monster->id,
                'name' => $bestPrice->monster->name,
                'slug' => $bestPrice->monster->slug,
                'size_label' => $bestPrice->monster->size_label,
            ],
            'site' => $site?->name,
            'domain' => $site?->domain,
            'currency' => $bestPrice->currency,
            'price_cents' => $snapshot?->price_cents,
            'shipping_cents' => $snapshot?->shipping_cents,
            'can_count' => $canCount,
            'price_per_can_cents' => $pricePerCanCents,
            'effective_total_cents' => $bestPrice->effective_total_cents,
            'effective_total' => sprintf('%s %0.2f', $bestPrice->currency, $bestPrice->effective_total_cents / 100),
            'checked_at' => $snapshot?->checked_at?->toIso8601String(),
            'status' => $snapshot?->status,
            'detail_url' => route('monsters.show', $bestPrice->monster),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function effectivePerCanCents(array $row): int
    {
        $storedPerCan = $row['price_per_can_cents'] ?? null;
        if (is_int($storedPerCan) && $storedPerCan > 0) {
            return $storedPerCan;
        }

        $canCount = $row['can_count'] ?? null;
        $effectiveTotal = $row['effective_total_cents'] ?? null;
        if (is_int($canCount) && $canCount > 0 && is_int($effectiveTotal)) {
            return (int) round($effectiveTotal / $canCount);
        }

        return is_int($effectiveTotal) ? $effectiveTotal : PHP_INT_MAX;
    }

    private function isFreshSnapshot(?string $checkedAt): bool
    {
        if (! is_string($checkedAt)) {
            return false;
        }

        return Carbon::parse($checkedAt)->greaterThanOrEqualTo(now()->subHours(72));
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
