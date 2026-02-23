<?php

namespace Packages\PublicBoard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BestPrice;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        $bestPrices = BestPrice::query()
            ->with([
                'monster:id,name,slug,size_label',
                'snapshot:id,monitor_id,checked_at,price_cents,shipping_cents,effective_total_cents,can_count,price_per_can_cents,currency,status',
                'snapshot.monitor:id,site_id,selector_config',
                'snapshot.monitor.site:id,name,domain',
            ])
            ->orderBy('effective_total_cents')
            ->get()
            ->map(function (BestPrice $bestPrice): array {
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
                    'effective_total' => $this->formatMoney($bestPrice->effective_total_cents, $bestPrice->currency),
                    'checked_at' => $snapshot?->checked_at?->toIso8601String(),
                    'status' => $snapshot?->status,
                    'detail_url' => route('monsters.show', $bestPrice->monster),
                ];
            })
            ->values();

        return Inertia::render('Public/BestPricesIndex', [
            'bestPrices' => $bestPrices,
            'stats' => [
                'tracked_monsters' => $bestPrices->unique(fn ($row) => $row['monster']['slug'])->count(),
                'offers' => $bestPrices->count(),
            ],
        ]);
    }

    private function formatMoney(int $cents, string $currency): string
    {
        return Str::of(sprintf('%s %0.2f', $currency, $cents / 100))->toString();
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
