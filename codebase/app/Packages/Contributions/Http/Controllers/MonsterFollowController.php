<?php

namespace Packages\Contributions\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\MonsterFollow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MonsterFollowController extends Controller
{
    public function store(Request $request, Monster $monster): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $request->validate([
            'currency' => ['nullable', 'string', Rule::in([Monitor::DEFAULT_CURRENCY])],
        ]);

        $follow = MonsterFollow::query()->firstOrCreate([
            'user_id' => (int) $user->id,
            'monster_id' => (int) $monster->id,
            'currency' => Monitor::DEFAULT_CURRENCY,
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'following' => true,
                'follow_id' => $follow->id,
                'currency' => Monitor::DEFAULT_CURRENCY,
            ]);
        }

        return back()->with('success', 'You are now following this monster.');
    }

    public function destroy(Request $request, Monster $monster): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $request->validate([
            'currency' => ['nullable', 'string', Rule::in([Monitor::DEFAULT_CURRENCY])],
        ]);

        MonsterFollow::query()
            ->where('user_id', (int) $user->id)
            ->where('monster_id', (int) $monster->id)
            ->where('currency', Monitor::DEFAULT_CURRENCY)
            ->delete();

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'following' => false,
                'currency' => Monitor::DEFAULT_CURRENCY,
            ]);
        }

        return back()->with('success', 'You stopped following this monster.');
    }
}

