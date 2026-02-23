<?php

namespace Packages\PublicBoard\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use Inertia\Inertia;
use Inertia\Response;

class MonsterController extends Controller
{
    public function show(Monster $monster): Response
    {
        $snapshots = PriceSnapshot::query()
            ->whereHas('monitor', fn ($query) => $query->where('monster_id', $monster->id))
            ->with(['monitor:id,site_id,product_url', 'monitor.site:id,name,domain'])
            ->latest('checked_at')
            ->limit(200)
            ->get()
            ->map(function (PriceSnapshot $snapshot): array {
                return [
                    'id' => $snapshot->id,
                    'checked_at' => $snapshot->checked_at?->toIso8601String(),
                    'price_cents' => $snapshot->price_cents,
                    'shipping_cents' => $snapshot->shipping_cents,
                    'effective_total_cents' => $snapshot->effective_total_cents,
                    'can_count' => $snapshot->can_count,
                    'price_per_can_cents' => $snapshot->price_per_can_cents,
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

        return Inertia::render('Monsters/Show', [
            'monster' => $monster,
            'snapshots' => $snapshots,
        ]);
    }
}
