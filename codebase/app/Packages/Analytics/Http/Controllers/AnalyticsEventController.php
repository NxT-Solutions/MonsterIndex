<?php

namespace Packages\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use App\Models\AnalyticsPageView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Packages\Analytics\Support\TrafficClassifier;

class AnalyticsEventController extends Controller
{
    public function __construct(
        private readonly TrafficClassifier $trafficClassifier,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'analytics_page_view_id' => ['nullable', 'integer', 'exists:analytics_page_views,id'],
            'visitor_id' => ['required', 'string', 'max:64'],
            'browser_session_id' => ['required', 'string', 'max:64'],
            'event_name' => ['required', 'string', 'max:64'],
            'route_name' => ['nullable', 'string', 'max:120'],
            'path' => ['nullable', 'string', 'max:255'],
            'label' => ['nullable', 'string', 'max:255'],
            'target_url' => ['nullable', 'string', 'max:2048'],
            'scroll_depth' => ['nullable', 'integer', 'min:0', 'max:100'],
            'properties' => ['nullable', 'array'],
        ]);

        $pageView = null;
        if (isset($validated['analytics_page_view_id'])) {
            $pageView = AnalyticsPageView::query()->find($validated['analytics_page_view_id']);
        }

        if ($pageView !== null) {
            $this->authorizeMutation($request, $pageView, $validated['visitor_id'], $validated['browser_session_id']);
        }

        $path = $validated['path'] ?? $pageView?->path;
        $pageKind = is_string($path)
            ? $this->trafficClassifier->pageKindForPath($path)
            : ($pageView?->page_kind ?? 'public');
        $targetUrl = $this->normalizeOptionalUrl($validated['target_url'] ?? null);

        AnalyticsEvent::query()->create([
            'analytics_page_view_id' => $pageView?->id,
            'visitor_id' => $validated['visitor_id'],
            'browser_session_id' => $validated['browser_session_id'],
            'user_id' => $request->user()?->id,
            'event_name' => $validated['event_name'],
            'route_name' => $validated['route_name'] ?? $pageView?->route_name,
            'page_kind' => $pageKind,
            'path' => $path,
            'label' => $validated['label'] ?? null,
            'target_host' => $this->trafficClassifier->extractHost($targetUrl),
            'target_url' => $targetUrl,
            'scroll_depth' => $validated['scroll_depth'] ?? null,
            'properties' => $validated['properties'] ?? null,
            'occurred_at' => now(),
        ]);

        if ($pageView !== null && in_array($validated['event_name'], ['outbound_click', 'search', 'follow_create', 'follow_remove'], true)) {
            $pageView->forceFill([
                'engaged_at' => $pageView->engaged_at ?? now(),
                'last_seen_at' => now(),
            ])->save();
        }

        return response()->json([], 204);
    }

    private function authorizeMutation(
        Request $request,
        AnalyticsPageView $pageView,
        string $visitorId,
        string $browserSessionId,
    ): void {
        $belongsToVisitor = $pageView->visitor_id === $visitorId
            && $pageView->browser_session_id === $browserSessionId;
        $belongsToUser = $request->user() !== null
            && $pageView->user_id !== null
            && (int) $pageView->user_id === (int) $request->user()->id;

        abort_unless($belongsToVisitor || $belongsToUser, 403);
    }

    private function normalizeOptionalUrl(?string $url): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        return trim($url);
    }
}
