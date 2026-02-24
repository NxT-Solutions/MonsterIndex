<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monster;
use App\Models\MonsterSuggestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MonsterSuggestionReviewController extends Controller
{
    public function index(): Response
    {
        $pending = MonsterSuggestion::query()
            ->where('status', MonsterSuggestion::STATUS_PENDING)
            ->with(['user:id,name,email'])
            ->latest('created_at')
            ->get();

        return Inertia::render('Admin/Review/Suggestions', [
            'pendingSuggestions' => $pending,
        ]);
    }

    public function approve(Request $request, MonsterSuggestion $suggestion): RedirectResponse
    {
        $this->authorize('review', MonsterSuggestion::class);

        $validated = $request->validate([
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('monsters', 'slug')],
            'review_note' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($suggestion->status !== MonsterSuggestion::STATUS_PENDING) {
            return back()->withErrors([
                'suggestion' => 'This suggestion is no longer pending.',
            ]);
        }

        $monster = Monster::query()->create([
            'name' => $suggestion->name,
            'slug' => $this->resolveUniqueSlug(
                baseSlug: $validated['slug'] ?? str($suggestion->name)->slug()->toString(),
            ),
            'size_label' => $suggestion->size_label,
            'active' => true,
        ]);

        $suggestion->forceFill([
            'status' => MonsterSuggestion::STATUS_APPROVED,
            'reviewed_by_user_id' => $request->user()?->id,
            'reviewed_at' => now(),
            'review_note' => $validated['review_note'] ?? null,
            'monster_id' => $monster->id,
        ])->save();

        return back()->with('success', 'Suggestion approved and monster created.');
    }

    public function reject(Request $request, MonsterSuggestion $suggestion): RedirectResponse
    {
        $this->authorize('review', MonsterSuggestion::class);

        $validated = $request->validate([
            'review_note' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($suggestion->status !== MonsterSuggestion::STATUS_PENDING) {
            return back()->withErrors([
                'suggestion' => 'This suggestion is no longer pending.',
            ]);
        }

        $suggestion->forceFill([
            'status' => MonsterSuggestion::STATUS_REJECTED,
            'reviewed_by_user_id' => $request->user()?->id,
            'reviewed_at' => now(),
            'review_note' => $validated['review_note'] ?? 'Rejected by moderator.',
        ])->save();

        return back()->with('success', 'Suggestion rejected.');
    }

    private function resolveUniqueSlug(string $baseSlug): string
    {
        $slug = str($baseSlug)->slug()->toString();
        if ($slug === '') {
            $slug = 'monster';
        }

        $candidate = $slug;
        $suffix = 2;

        while (Monster::query()->where('slug', $candidate)->exists()) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }
}
