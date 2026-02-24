<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Packages\Notifications\Services\WebPushService;

class PushTestController extends Controller
{
    public function __construct(
        private readonly WebPushService $webPushService,
    ) {}

    public function send(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:280'],
            'url' => ['nullable', 'string', 'max:2048'],
        ]);

        $user = User::query()->findOrFail((int) $validated['user_id']);
        $targetUrl = trim((string) ($validated['url'] ?? ''));
        if ($targetUrl === '') {
            $targetUrl = route('dashboard', absolute: false);
        }

        $result = $this->webPushService->sendToUser($user, [
            'title' => (string) $validated['title'],
            'body' => (string) $validated['body'],
            'url' => $targetUrl,
            'icon' => '/android-chrome-192x192.png',
            'badge' => '/favicon-32x32.png',
            'tag' => 'admin-test-'.$user->id,
            'data' => [
                'source' => 'admin_test',
                'user_id' => $user->id,
            ],
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                ...$result,
            ]);
        }

        $message = sprintf(
            'Push test sent. Success: %d, Failed: %d',
            $result['success_count'],
            $result['failure_count'],
        );

        return back()->with($result['success_count'] > 0 ? 'success' : 'warning', $message);
    }
}

