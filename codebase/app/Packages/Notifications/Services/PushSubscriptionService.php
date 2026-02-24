<?php

namespace Packages\Notifications\Services;

use App\Models\PushSubscription;
use App\Models\User;

class PushSubscriptionService
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function upsert(User $user, array $payload, ?string $userAgent = null): PushSubscription
    {
        $keys = is_array($payload['keys'] ?? null) ? $payload['keys'] : [];

        return PushSubscription::query()->updateOrCreate(
            ['endpoint' => (string) $payload['endpoint']],
            [
                'user_id' => $user->id,
                'p256dh' => (string) ($keys['p256dh'] ?? ''),
                'auth' => (string) ($keys['auth'] ?? ''),
                'content_encoding' => isset($payload['contentEncoding'])
                    ? (string) $payload['contentEncoding']
                    : (isset($payload['content_encoding']) ? (string) $payload['content_encoding'] : null),
                'user_agent' => $userAgent,
                'last_seen_at' => now(),
            ],
        );
    }

    public function deleteByEndpoint(User $user, string $endpoint): int
    {
        return PushSubscription::query()
            ->where('user_id', $user->id)
            ->where('endpoint', $endpoint)
            ->delete();
    }
}

