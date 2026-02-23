<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SiteController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Sites/Index', [
            'sites' => Site::query()->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'domain' => ['required', 'string', 'max:255', 'unique:sites,domain'],
            'active' => ['sometimes', 'boolean'],
        ]);

        Site::query()->create([
            'name' => $validated['name'],
            'domain' => strtolower(trim($validated['domain'])),
            'active' => $validated['active'] ?? true,
        ]);

        return back()->with('success', 'Site created.');
    }

    public function update(Request $request, Site $site): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'domain' => ['required', 'string', 'max:255', Rule::unique('sites', 'domain')->ignore($site->id)],
            'active' => ['required', 'boolean'],
        ]);

        $site->update([
            'name' => $validated['name'],
            'domain' => strtolower(trim($validated['domain'])),
            'active' => $validated['active'],
        ]);

        return back()->with('success', 'Site updated.');
    }

    public function destroy(Site $site): RedirectResponse
    {
        if ($site->monitors()->exists()) {
            throw ValidationException::withMessages([
                'site' => 'Cannot delete a site that still has monitors.',
            ]);
        }

        $site->delete();

        return back()->with('success', 'Site deleted.');
    }
}
