<?php

namespace Packages\Bookmarklet\Services;

use App\Models\BookmarkletSession;
use App\Models\Monitor;
use App\Models\User;
use Illuminate\Support\Str;

class BookmarkletSessionService
{
    public function create(Monitor $monitor, User $creator, int $ttlMinutes = 15): BookmarkletSession
    {
        return BookmarkletSession::query()->create([
            'monitor_id' => $monitor->id,
            'created_by_user_id' => $creator->id,
            'token' => Str::random(40),
            'expires_at' => now()->addMinutes($ttlMinutes),
        ]);
    }

    public function resolveValidToken(string $token): ?BookmarkletSession
    {
        $session = BookmarkletSession::query()
            ->where('token', $token)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        return $session;
    }

    public function markUsed(BookmarkletSession $session): void
    {
        $session->forceFill([
            'used_at' => now(),
        ])->save();
    }
}
