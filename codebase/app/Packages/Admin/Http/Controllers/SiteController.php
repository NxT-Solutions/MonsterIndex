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
        return Inertia::render('Admin/Stores/Index', [
            'stores' => Site::query()
                ->withCount('monitors')
                ->orderBy('name')
                ->get(['id', 'name', 'domain', 'active']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'domain' => $this->normalizeDomain((string) $request->input('domain')),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'domain' => [
                'required',
                'string',
                'max:255',
                'regex:/^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/',
                'unique:sites,domain',
            ],
            'active' => ['sometimes', 'boolean'],
        ]);

        Site::query()->create([
            'name' => trim($validated['name']),
            'domain' => $validated['domain'],
            'active' => $validated['active'] ?? true,
        ]);

        return back()->with('success', __('Store created.'));
    }

    public function update(Request $request, Site $site): RedirectResponse
    {
        $request->merge([
            'domain' => $this->normalizeDomain((string) $request->input('domain')),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'domain' => [
                'required',
                'string',
                'max:255',
                'regex:/^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/',
                Rule::unique('sites', 'domain')->ignore($site->id),
            ],
            'active' => ['required', 'boolean'],
        ]);

        $site->update([
            'name' => trim($validated['name']),
            'domain' => $validated['domain'],
            'active' => $validated['active'],
        ]);

        return back()->with('success', __('Store updated.'));
    }

    public function destroy(Site $site): RedirectResponse
    {
        if ($site->monitors()->exists()) {
            throw ValidationException::withMessages([
                'site' => __('Cannot delete a store that still has monitors.'),
            ]);
        }

        $site->delete();

        return back()->with('success', __('Store deleted.'));
    }

    private function normalizeDomain(string $value): string
    {
        $domain = strtolower(trim($value));
        if ($domain === '') {
            return '';
        }

        if (str_contains($domain, '://')) {
            $host = parse_url($domain, PHP_URL_HOST);
            $domain = strtolower((string) $host);
        }

        $domain = explode('/', $domain)[0] ?? $domain;
        $domain = explode(':', $domain)[0] ?? $domain;

        return trim($domain);
    }
}
