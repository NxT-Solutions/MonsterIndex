<?php

namespace Packages\Notifications\Http\Controllers;

use App\Models\PushSubscription;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Packages\Notifications\Services\PushSubscriptionService;
use Packages\Notifications\Services\WebPushService;

class PushSubscriptionController extends Controller
{
    public function __construct(
        private readonly PushSubscriptionService $pushSubscriptionService,
        private readonly WebPushService $webPushService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $subscriptions = PushSubscription::query()
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->get()
            ->map(fn (PushSubscription $subscription): array => [
                'id' => $subscription->id,
                'endpoint' => $subscription->endpoint,
                'user_agent' => $subscription->user_agent,
                'created_at' => $subscription->created_at?->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'subscriptions' => $subscriptions,
        ]);
    }

    public function vapidPublicKey(Request $request): JsonResponse
    {
        $request->user() ?? abort(401);

        $publicKey = $this->webPushService->vapidPublicKey();
        if (! $publicKey) {
            return response()->json([
                'message' => 'Push is not configured.',
            ], 503);
        }

        return response()->json([
            'public_key' => $publicKey,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $validated = $request->validate([
            'endpoint' => ['required', 'url', 'max:4096'],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string', 'max:2048'],
            'keys.auth' => ['required', 'string', 'max:2048'],
            'expirationTime' => ['nullable'],
            'contentEncoding' => ['nullable', 'string', 'max:32'],
        ]);

        $subscription = $this->pushSubscriptionService->upsert(
            $user,
            $validated,
            $request->userAgent(),
        );

        return response()->json([
            'ok' => true,
            'id' => $subscription->id,
            'endpoint' => $subscription->endpoint,
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $validated = $request->validate([
            'endpoint' => ['required', 'string', 'max:4096'],
        ]);

        $deleted = $this->pushSubscriptionService->deleteByEndpoint(
            $user,
            (string) $validated['endpoint'],
        );

        return response()->json([
            'ok' => true,
            'deleted' => $deleted,
        ]);
    }
}
