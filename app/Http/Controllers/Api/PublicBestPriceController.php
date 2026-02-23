<?php

namespace App\Http\Controllers\Api;

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
                'snapshot:id,monitor_id,checked_at,price_cents,shipping_cents,effective_total_cents,currency,status',
                'snapshot.monitor:id,site_id',
                'snapshot.monitor.site:id,name,domain',
            ])
            ->orderBy('effective_total_cents')
            ->get()
            ->map(function (BestPrice $bestPrice): array {
                return [
                    'monster' => [
                        'name' => $bestPrice->monster->name,
                        'slug' => $bestPrice->monster->slug,
                        'size_label' => $bestPrice->monster->size_label,
                    ],
                    'site' => $bestPrice->snapshot?->monitor?->site?->name,
                    'domain' => $bestPrice->snapshot?->monitor?->site?->domain,
                    'currency' => $bestPrice->currency,
                    'price_cents' => $bestPrice->snapshot?->price_cents,
                    'shipping_cents' => $bestPrice->snapshot?->shipping_cents,
                    'effective_total_cents' => $bestPrice->effective_total_cents,
                    'checked_at' => $bestPrice->snapshot?->checked_at?->toIso8601String(),
                    'status' => $bestPrice->snapshot?->status,
                ];
            })
            ->values();

        return response()->json([
            'data' => $rows,
        ]);
    }
}
