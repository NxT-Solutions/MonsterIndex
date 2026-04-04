<?php

namespace Packages\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsPageView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Packages\Analytics\Support\TrafficClassifier;

class AnalyticsPageViewController extends Controller
{
    public function __construct(
        private readonly TrafficClassifier $trafficClassifier,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'visitor_id' => ['required', 'string', 'max:64'],
            'browser_session_id' => ['required', 'string', 'max:64'],
            'route_name' => ['nullable', 'string', 'max:120'],
            'page_component' => ['nullable', 'string', 'max:160'],
            'url' => ['required', 'string', 'max:2048'],
            'path' => ['nullable', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'referrer_url' => ['nullable', 'string', 'max:2048'],
            'viewport_width' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'viewport_height' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'locale' => ['nullable', 'string', 'max:16'],
        ]);

        $path = $this->normalizePath(
            $validated['path'] ?? null,
            $validated['url'],
        );

        abort_unless($path !== null, 422, 'A valid path is required.');

        $utmValues = $this->extractUtmValues($validated['url']);
        $referrerUrl = $this->normalizeOptionalUrl($validated['referrer_url'] ?? null);
        $referrerHost = $this->trafficClassifier->extractHost($referrerUrl);
        $userAgentDetails = $this->trafficClassifier->parseUserAgent($request->userAgent());

        $pageView = AnalyticsPageView::query()->create([
            'visitor_id' => $validated['visitor_id'],
            'browser_session_id' => $validated['browser_session_id'],
            'user_id' => $request->user()?->id,
            'route_name' => $validated['route_name'] ?? null,
            'page_component' => $validated['page_component'] ?? null,
            'page_kind' => $this->trafficClassifier->pageKindForPath($path),
            'path' => $path,
            'url' => $validated['url'],
            'title' => $validated['title'] ?? null,
            'referrer_host' => $referrerHost,
            'referrer_url' => $referrerUrl,
            'channel' => $this->trafficClassifier->channelForReferrer(
                $referrerUrl,
                $utmValues['utm_source'],
                $utmValues['utm_medium'],
                $request->getHost(),
            ),
            'utm_source' => $utmValues['utm_source'],
            'utm_medium' => $utmValues['utm_medium'],
            'utm_campaign' => $utmValues['utm_campaign'],
            'device_type' => $userAgentDetails['device_type'],
            'browser_family' => $userAgentDetails['browser_family'],
            'os_family' => $userAgentDetails['os_family'],
            'locale' => $validated['locale'] ?? app()->getLocale(),
            'is_authenticated' => $request->user() !== null,
            'viewport_width' => $validated['viewport_width'] ?? null,
            'viewport_height' => $validated['viewport_height'] ?? null,
            'viewed_at' => now(),
            'last_seen_at' => now(),
        ]);

        return response()->json([
            'id' => $pageView->id,
        ]);
    }

    public function close(Request $request, AnalyticsPageView $pageView): JsonResponse
    {
        $validated = $request->validate([
            'visitor_id' => ['required', 'string', 'max:64'],
            'browser_session_id' => ['required', 'string', 'max:64'],
            'duration_seconds' => ['required', 'integer', 'min:0', 'max:86400'],
            'max_scroll_depth' => ['nullable', 'integer', 'min:0', 'max:100'],
            'engaged' => ['nullable', 'boolean'],
        ]);

        $this->authorizeMutation($request, $pageView, $validated['visitor_id'], $validated['browser_session_id']);

        $pageView->forceFill([
            'duration_seconds' => max(
                (int) $pageView->duration_seconds,
                (int) $validated['duration_seconds'],
            ),
            'max_scroll_depth' => max(
                (int) $pageView->max_scroll_depth,
                (int) ($validated['max_scroll_depth'] ?? 0),
            ),
            'last_seen_at' => now(),
            'ended_at' => now(),
            'engaged_at' => ($validated['engaged'] ?? false)
                ? ($pageView->engaged_at ?? now())
                : $pageView->engaged_at,
        ])->save();

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

    private function normalizePath(?string $path, string $url): ?string
    {
        $candidate = is_string($path) && trim($path) !== ''
            ? trim($path)
            : parse_url($url, PHP_URL_PATH);

        return is_string($candidate) && $candidate !== '' ? $candidate : null;
    }

    /**
     * @return array{utm_source: ?string, utm_medium: ?string, utm_campaign: ?string}
     */
    private function extractUtmValues(string $url): array
    {
        $query = parse_url($url, PHP_URL_QUERY);
        if (! is_string($query) || $query === '') {
            return [
                'utm_source' => null,
                'utm_medium' => null,
                'utm_campaign' => null,
            ];
        }

        parse_str($query, $params);

        return [
            'utm_source' => $this->normalizeNullableString($params['utm_source'] ?? null),
            'utm_medium' => $this->normalizeNullableString($params['utm_medium'] ?? null),
            'utm_campaign' => $this->normalizeNullableString($params['utm_campaign'] ?? null),
        ];
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
