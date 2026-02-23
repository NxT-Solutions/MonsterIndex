<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Monster;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MonsterController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Monsters/Index', [
            'monsters' => Monster::query()
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:monsters,slug'],
            'size_label' => ['nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
        ]);

        Monster::query()->create([
            'name' => $validated['name'],
            'slug' => $this->resolveUniqueSlug(
                baseSlug: $validated['slug'] ?? str($validated['name'])->slug()->toString(),
            ),
            'size_label' => $validated['size_label'] ?? null,
            'active' => $validated['active'] ?? true,
        ]);

        return back()->with('success', 'Monster created.');
    }

    public function update(Request $request, Monster $monster): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('monsters', 'slug')->ignore($monster->id)],
            'size_label' => ['nullable', 'string', 'max:255'],
            'active' => ['required', 'boolean'],
        ]);

        $monster->update([
            'name' => $validated['name'],
            'slug' => $this->resolveUniqueSlug(
                baseSlug: $validated['slug'] ?? str($validated['name'])->slug()->toString(),
                ignoreId: $monster->id,
            ),
            'size_label' => $validated['size_label'] ?? null,
            'active' => $validated['active'],
        ]);

        return back()->with('success', 'Monster updated.');
    }

    public function destroy(Monster $monster): RedirectResponse
    {
        if ($monster->monitors()->exists()) {
            throw ValidationException::withMessages([
                'monster' => 'Cannot delete a monster that still has monitors.',
            ]);
        }

        $monster->delete();

        return back()->with('success', 'Monster deleted.');
    }

    private function resolveUniqueSlug(string $baseSlug, ?int $ignoreId = null): string
    {
        $slug = str($baseSlug)->slug()->toString();
        if ($slug === '') {
            $slug = 'monster';
        }

        $candidate = $slug;
        $suffix = 2;

        while (Monster::query()
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where('slug', $candidate)
            ->exists()) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
