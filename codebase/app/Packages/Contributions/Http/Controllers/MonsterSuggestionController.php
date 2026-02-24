<?php

namespace Packages\Contributions\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monster;
use App\Models\MonsterSuggestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MonsterSuggestionController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', MonsterSuggestion::class);
        $user = $request->user();
        abort_unless($user !== null, 401);

        $suggestions = MonsterSuggestion::query()
            ->where('user_id', $user->id)
            ->with(['reviewer:id,name', 'monster:id,name,slug'])
            ->latest('id')
            ->get();

        return Inertia::render('Contribute/Suggestions/Index', [
            'suggestions' => $suggestions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', MonsterSuggestion::class);
        $user = $request->user();
        abort_unless($user !== null, 401);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'size_label' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $normalizedName = $this->normalizeName($validated['name']);

        $duplicateSuggestionExists = MonsterSuggestion::query()
            ->where('normalized_name', $normalizedName)
            ->whereIn('status', [MonsterSuggestion::STATUS_PENDING, MonsterSuggestion::STATUS_APPROVED])
            ->exists();
        if ($duplicateSuggestionExists) {
            throw ValidationException::withMessages([
                'name' => 'This monster already has a pending or approved suggestion.',
            ]);
        }

        $existingMonsterExists = Monster::query()
            ->whereRaw('LOWER(name) = ?', [$normalizedName])
            ->exists();
        if ($existingMonsterExists) {
            throw ValidationException::withMessages([
                'name' => 'This monster already exists in the catalog.',
            ]);
        }

        MonsterSuggestion::query()->create([
            'user_id' => $user->id,
            'name' => trim($validated['name']),
            'normalized_name' => $normalizedName,
            'size_label' => $validated['size_label'] ? trim($validated['size_label']) : null,
            'notes' => isset($validated['notes']) && $validated['notes'] !== null
                ? trim((string) $validated['notes'])
                : null,
            'status' => MonsterSuggestion::STATUS_PENDING,
        ]);

        return back()->with('success', 'Monster suggestion submitted for review.');
    }

    private function normalizeName(string $name): string
    {
        $name = preg_replace('/\s+/', ' ', trim($name));
        $name = is_string($name) ? $name : trim($name ?? '');

        return mb_strtolower($name);
    }
}
