<?php

namespace Packages\Contributions\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ContributorAlert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContributorAlertController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $alerts = ContributorAlert::query()
            ->where('user_id', $user->id)
            ->with([
                'monster:id,name,slug,size_label',
                'monitor:id,site_id',
                'monitor.site:id,name,domain',
                'snapshot:id,checked_at,effective_total_cents,price_per_can_cents,can_count,currency',
            ])
            ->latest('id')
            ->paginate(50)
            ->withQueryString();

        $stats = [
            'total' => ContributorAlert::query()
                ->where('user_id', $user->id)
                ->count(),
            'unread' => ContributorAlert::query()
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->count(),
            'last_24h' => ContributorAlert::query()
                ->where('user_id', $user->id)
                ->where('created_at', '>=', now()->subDay())
                ->count(),
        ];

        return Inertia::render('Contribute/Alerts/Index', [
            'alerts' => $alerts,
            'stats' => $stats,
        ]);
    }

    public function markRead(Request $request, ContributorAlert $alert): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        if ((int) $alert->user_id !== (int) $user->id) {
            abort(403);
        }

        if ($alert->read_at === null) {
            $alert->update(['read_at' => now()]);
        }

        if ($request->expectsJson()) {
            return response()->json(['ok' => true]);
        }

        return back()->with('success', 'Alert marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        ContributorAlert::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        if ($request->expectsJson()) {
            return response()->json(['ok' => true]);
        }

        return back()->with('success', 'All alerts marked as read.');
    }
}
