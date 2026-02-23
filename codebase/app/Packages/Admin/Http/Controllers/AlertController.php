<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\RedirectResponse;
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
        ]);
    }

    public function markRead(Alert $alert): RedirectResponse
    {
        $alert->update([
            'read_at' => now(),
        ]);

        return back()->with('success', 'Alert marked as read.');
    }
}
