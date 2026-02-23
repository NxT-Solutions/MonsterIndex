<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Services\Bookmarklet\BookmarkletScriptBuilder;
use App\Services\Bookmarklet\BookmarkletSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BookmarkletController extends Controller
{
    public function __construct(
        private readonly BookmarkletSessionService $bookmarkletSessionService,
        private readonly BookmarkletScriptBuilder $bookmarkletScriptBuilder,
    ) {}

    public function session(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'monitor_id' => ['required', 'integer', 'exists:monitors,id'],
        ]);

        $monitor = Monitor::query()->findOrFail($validated['monitor_id']);
        $session = $this->bookmarkletSessionService->create($monitor, $request->user());

        $scriptUrl = route('bookmarklet.script', [
            'token' => $session->token,
        ], absolute: true);

        return response()->json([
            'token' => $session->token,
            'expires_at' => $session->expires_at->toIso8601String(),
            'loader_url' => $scriptUrl,
            'bookmarklet' => $this->bookmarkletScriptBuilder->build($scriptUrl),
        ]);
    }

    public function script(): Response
    {
        $script = (string) file_get_contents(resource_path('js/bookmarklet/selector.js'));

        return response($script, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }
}
