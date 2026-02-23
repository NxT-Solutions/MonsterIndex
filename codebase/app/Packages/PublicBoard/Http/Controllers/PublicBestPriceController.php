<?php

namespace Packages\PublicBoard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BestPrice;
use Illuminate\Http\JsonResponse;

class PublicBestPriceController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = BestPrice::query()
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
                $manualCanCount = $this->manualCanCountFromSelectorConfig(
                    $snapshot?->monitor?->selector_config,
                );
                $canCount = $snapshot?->can_count ?? $manualCanCount;
                $pricePerCanCents = $snapshot?->price_per_can_cents;
                if ($pricePerCanCents === null && $canCount !== null && $canCount > 0) {
                    $pricePerCanCents = (int) round($bestPrice->effective_total_cents / $canCount);
                }

                return [
                    'monster' => [
                        'name' => $bestPrice->monster->name,
                        'slug' => $bestPrice->monster->slug,
                        'size_label' => $bestPrice->monster->size_label,
                    ],
                    'site' => $snapshot?->monitor?->site?->name,
                    'domain' => $snapshot?->monitor?->site?->domain,
                    'currency' => $bestPrice->currency,
                    'price_cents' => $snapshot?->price_cents,
                    'shipping_cents' => $snapshot?->shipping_cents,
                    'can_count' => $canCount,
                    'price_per_can_cents' => $pricePerCanCents,
                    'effective_total_cents' => $bestPrice->effective_total_cents,
                    'checked_at' => $snapshot?->checked_at?->toIso8601String(),
                    'status' => $snapshot?->status,
                ];
            })
            ->values();

        return response()->json([
            'data' => $rows,
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
