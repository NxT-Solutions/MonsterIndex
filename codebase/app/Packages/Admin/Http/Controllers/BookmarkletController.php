<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use Packages\Bookmarklet\Services\BookmarkletSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Throwable;

class BookmarkletController extends Controller
{
    public function __construct(
        private readonly BookmarkletSessionService $bookmarkletSessionService,
    ) {}

    public function session(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'monitor_id' => ['required', 'integer', 'exists:monitors,id'],
        ]);

        $monitor = Monitor::query()->findOrFail($validated['monitor_id']);
        $session = $this->bookmarkletSessionService->create($monitor, $request->user());

        return response()->json([
            'token' => $session->token,
            'expires_at' => $session->expires_at->toIso8601String(),
            'selector_browser_url' => route('admin.monitors.selector-browser', [
                'monitor' => $monitor->id,
                'token' => $session->token,
                'url' => $monitor->product_url,
            ], absolute: true),
        ]);
    }

    public function selectorBrowser(Request $request, Monitor $monitor): Response
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'url' => ['nullable', 'url', 'max:2048'],
        ]);

        $session = $this->bookmarkletSessionService->resolveValidToken($validated['token']);
        abort_unless(
            $session !== null
            && (int) $session->monitor_id === (int) $monitor->id
            && (int) $session->created_by_user_id === (int) $request->user()->id,
            403,
            'Selector token is invalid or expired.',
        );

        $targetUrl = $validated['url'] ?: $monitor->product_url;
        if (! $this->supportsUrl($targetUrl)) {
            abort(422, 'Only HTTP/HTTPS URLs are supported.');
        }

        $html = $this->fetchHtml($targetUrl);
        if ($html === null) {
            $message = 'Failed to fetch the target page. Check URL, anti-bot protection, or try another page.';

            return response($this->renderErrorDocument($message), 502, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            ]);
        }

        $selectorScriptUrl = route('bookmarklet.script', [
            'token' => $session->token,
            'source_url' => $targetUrl,
        ], absolute: true);

        $actionUrl = route('admin.monitors.selector-browser', ['monitor' => $monitor->id], absolute: true);
        $injected = $this->injectSelectorRuntime(
            html: $html,
            monitorName: $monitor->monster?->name ?: 'Monitor',
            currentUrl: $targetUrl,
            token: $session->token,
            actionUrl: $actionUrl,
            selectorScriptUrl: $selectorScriptUrl,
        );

        return response($injected, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
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

    private function fetchHtml(string $url): ?string
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'MonsterIndexBot/1.0 (+https://monsterindex.example)',
                'Accept-Language' => 'en-US,en;q=0.9',
            ])->timeout(20)
                ->retry(2, 400)
                ->get($url);

            if (! $response->successful()) {
                return null;
            }

            return $response->body();
        } catch (Throwable) {
            return null;
        }
    }

    private function supportsUrl(string $url): bool
    {
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        return in_array($scheme, ['http', 'https'], true);
    }

    private function renderErrorDocument(string $message): string
    {
        $escapedMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Selector Browser Error</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: ui-sans-serif,system-ui,-apple-system,sans-serif; background: #f8fafc; color: #0f172a; }
    .card { width: min(680px, calc(100% - 2rem)); border: 1px solid #cbd5e1; border-radius: 12px; background: #fff; padding: 1rem 1.25rem; }
    h1 { margin-top: 0; color: #b91c1c; font-size: 1.1rem; }
    p { line-height: 1.45; }
  </style>
</head>
<body>
  <div class="card">
    <h1>MonsterIndex Selector Browser</h1>
    <p>{$escapedMessage}</p>
  </div>
</body>
</html>
HTML;
    }

    private function injectSelectorRuntime(
        string $html,
        string $monitorName,
        string $currentUrl,
        string $token,
        string $actionUrl,
        string $selectorScriptUrl,
    ): string {
        $escapedMonitorName = htmlspecialchars($monitorName, ENT_QUOTES, 'UTF-8');
        $escapedCurrentUrl = htmlspecialchars($currentUrl, ENT_QUOTES, 'UTF-8');
        $escapedToken = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');
        $escapedActionUrl = htmlspecialchars($actionUrl, ENT_QUOTES, 'UTF-8');
        $escapedSelectorScriptUrl = htmlspecialchars($selectorScriptUrl, ENT_QUOTES, 'UTF-8');
        $encodedCurrentUrl = json_encode($currentUrl);
        if (! is_string($encodedCurrentUrl)) {
            $encodedCurrentUrl = '""';
        }

        $runtime = <<<HTML
<style data-monsterindex-ignore="true">
  html { scroll-padding-top: 76px; }
  #monsterindex-selector-toolbar { position: sticky; top: 0; z-index: 2147483646; background: #0f172a; color: #f8fafc; padding: 12px 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; border-bottom: 2px solid #f97316; font: 13px/1.2 ui-sans-serif,system-ui,-apple-system,sans-serif; }
  #monsterindex-selector-toolbar strong { color: #fb923c; }
  #monsterindex-selector-toolbar form { display: flex; gap: 8px; align-items: center; flex: 1 1 460px; min-width: 260px; }
  #monsterindex-selector-toolbar input[type="url"] { flex: 1 1 auto; min-width: 220px; border: 1px solid #334155; border-radius: 6px; padding: 7px 9px; background: #0b1220; color: #f8fafc; }
  #monsterindex-selector-toolbar button { border: 1px solid #334155; background: #1e293b; color: #f8fafc; border-radius: 6px; padding: 7px 10px; cursor: pointer; }
  #monsterindex-selector-toolbar button:hover { background: #334155; }
</style>
<div id="monsterindex-selector-toolbar" data-monsterindex-ignore="true">
  <strong>MonsterIndex Selector Mode</strong>
  <span>{$escapedMonitorName}</span>
  <form method="get" action="{$escapedActionUrl}">
    <input type="hidden" name="token" value="{$escapedToken}">
    <input type="url" name="url" value="{$escapedCurrentUrl}" placeholder="https://example.com/product-url" required>
    <button type="submit">Open URL</button>
  </form>
</div>
<script data-monsterindex-ignore="true" src="{$escapedSelectorScriptUrl}" defer></script>
<script data-monsterindex-ignore="true">
  (() => {
    const currentSourceUrl = {$encodedCurrentUrl};
    document.addEventListener('click', (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      if (anchor.closest('[data-monsterindex-ignore="true"]')) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

      event.preventDefault();

      try {
        const nextUrl = new URL(rawHref, currentSourceUrl).toString();
        const proxyUrl = new URL(window.location.href);
        proxyUrl.searchParams.set('url', nextUrl);
        window.location.assign(proxyUrl.toString());
      } catch (_) {
        // Ignore malformed links and allow normal page behavior.
      }
    }, true);
  })();
</script>
HTML;

        $baseTag = '<base href="'.$escapedCurrentUrl.'">';
        if (preg_match('/<head[^>]*>/i', $html) === 1) {
            $html = (string) preg_replace('/<head[^>]*>/i', '$0'.$baseTag, $html, 1);
        } else {
            $html = '<head>'.$baseTag.'</head>'.$html;
        }

        if (preg_match('/<body[^>]*>/i', $html) === 1) {
            return (string) preg_replace('/<body[^>]*>/i', '$0'.$runtime, $html, 1);
        }

        return '<body>'.$runtime.$html.'</body>';
    }
}
