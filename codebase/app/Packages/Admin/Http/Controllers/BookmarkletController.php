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
            'lang' => ['nullable', 'in:en,nl'],
        ]);

        $monitor = Monitor::query()->findOrFail($validated['monitor_id']);
        $session = $this->bookmarkletSessionService->create($monitor, $request->user());
        $lang = $validated['lang'] ?? 'en';

        return response()->json([
            'token' => $session->token,
            'expires_at' => $session->expires_at->toIso8601String(),
            'selector_browser_url' => route('admin.monitors.selector-browser', [
                'monitor' => $monitor->id,
                'token' => $session->token,
                'url' => $monitor->product_url,
                'lang' => $lang,
            ], absolute: true),
        ]);
    }

    public function selectorBrowser(Request $request, Monitor $monitor): Response
    {
        $monitor->loadMissing('monster');

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'url' => ['nullable', 'url', 'max:2048'],
            'lang' => ['nullable', 'in:en,nl'],
        ]);
        $lang = $validated['lang'] ?? 'en';

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
            abort(422, $this->translate($lang, 'Only HTTP/HTTPS URLs are supported.', 'Alleen HTTP/HTTPS-URL\'s worden ondersteund.'));
        }

        $html = $this->fetchHtml($targetUrl);
        if ($html === null) {
            $message = $this->translate(
                $lang,
                'Failed to fetch the target page. Check URL, anti-bot protection, or try another page.',
                'Kon de doelpagina niet ophalen. Controleer de URL, anti-botbescherming of probeer een andere pagina.',
            );

            return response($this->renderErrorDocument($message, $lang), 502, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            ]);
        }

        $returnUrl = $monitor->monster
            ? route('admin.monsters.show', [
                'monster' => $monitor->monster->slug,
                'lang' => $lang,
            ], absolute: true)
            : route('admin.monsters.index', ['lang' => $lang], absolute: true);

        $selectorScriptUrl = route('bookmarklet.script', [
            'token' => $session->token,
            'source_url' => $targetUrl,
            'return_url' => $returnUrl,
            'lang' => $lang,
        ], absolute: true);

        $actionUrl = route(
            'admin.monitors.selector-browser',
            [
                'monitor' => $monitor->id,
                'lang' => $lang,
            ],
            absolute: true,
        );
        $injected = $this->injectSelectorRuntime(
            html: $html,
            monitorName: $monitor->monster?->name ?: 'Monitor',
            currentUrl: $targetUrl,
            token: $session->token,
            actionUrl: $actionUrl,
            returnUrl: $returnUrl,
            selectorScriptUrl: $selectorScriptUrl,
            lang: $lang,
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

    private function renderErrorDocument(string $message, string $lang = 'en'): string
    {
        $escapedMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        $title = htmlspecialchars(
            $this->translate($lang, 'Selector Browser Error', 'Selectorbrowser Fout'),
            ENT_QUOTES,
            'UTF-8',
        );
        $header = htmlspecialchars(
            $this->translate($lang, 'MonsterIndex Selector Browser', 'MonsterIndex Selectorbrowser'),
            ENT_QUOTES,
            'UTF-8',
        );
        $docLang = htmlspecialchars($lang === 'nl' ? 'nl' : 'en', ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!doctype html>
<html lang="{$docLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{$title}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: ui-sans-serif,system-ui,-apple-system,sans-serif; background: #f8fafc; color: #0f172a; }
    .card { width: min(680px, calc(100% - 2rem)); border: 1px solid #cbd5e1; border-radius: 12px; background: #fff; padding: 1rem 1.25rem; }
    h1 { margin-top: 0; color: #b91c1c; font-size: 1.1rem; }
    p { line-height: 1.45; }
  </style>
</head>
<body>
  <div class="card">
    <h1>{$header}</h1>
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
        string $returnUrl,
        string $selectorScriptUrl,
        string $lang = 'en',
    ): string {
        $escapedMonitorName = htmlspecialchars($monitorName, ENT_QUOTES, 'UTF-8');
        $escapedCurrentUrl = htmlspecialchars($currentUrl, ENT_QUOTES, 'UTF-8');
        $escapedToken = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');
        $escapedActionUrl = htmlspecialchars($actionUrl, ENT_QUOTES, 'UTF-8');
        $escapedReturnUrl = htmlspecialchars($returnUrl, ENT_QUOTES, 'UTF-8');
        $escapedSelectorScriptUrl = htmlspecialchars($selectorScriptUrl, ENT_QUOTES, 'UTF-8');
        $escapedLang = htmlspecialchars($lang === 'nl' ? 'nl' : 'en', ENT_QUOTES, 'UTF-8');
        $headerLabel = htmlspecialchars(
            $this->translate($lang, 'Guided Selector Setup', 'Geleide Selector Setup'),
            ENT_QUOTES,
            'UTF-8',
        );
        $stayMessage = htmlspecialchars(
            $this->translate(
                $lang,
                'Stay on this page while selecting. We keep navigation in selector mode until you save.',
                'Blijf op deze pagina tijdens het selecteren. We houden navigatie in selectormodus tot je opslaat.',
            ),
            ENT_QUOTES,
            'UTF-8',
        );
        $inputPlaceholder = htmlspecialchars(
            $this->translate($lang, 'https://example.com/product-url', 'https://voorbeeld.com/product-url'),
            ENT_QUOTES,
            'UTF-8',
        );
        $openUrlLabel = htmlspecialchars(
            $this->translate($lang, 'Open URL', 'Open URL'),
            ENT_QUOTES,
            'UTF-8',
        );
        $backLabel = htmlspecialchars(
            $this->translate($lang, 'Back to Admin', 'Terug naar Admin'),
            ENT_QUOTES,
            'UTF-8',
        );
        $formBlockedMessage = json_encode(
            $this->translate(
                $lang,
                'Form submission is disabled in selector mode. Use the URL field in the top bar to navigate safely.',
                'Formulierverzending is uitgeschakeld in selectormodus. Gebruik het URL-veld in de bovenbalk om veilig te navigeren.',
            ),
        );
        $unsavedLeaveMessage = json_encode(
            $this->translate(
                $lang,
                'You still have unsaved selector changes. Leave anyway?',
                'Je hebt nog niet-opgeslagen selectorwijzigingen. Toch verlaten?',
            ),
        );
        $encodedCurrentUrl = json_encode($currentUrl);
        if (! is_string($encodedCurrentUrl)) {
            $encodedCurrentUrl = '""';
        }
        if (! is_string($formBlockedMessage)) {
            $formBlockedMessage = '""';
        }
        if (! is_string($unsavedLeaveMessage)) {
            $unsavedLeaveMessage = '""';
        }

        $runtime = <<<HTML
<style data-monsterindex-ignore="true">
  html { scroll-padding-top: 76px; }
  #monsterindex-selector-toolbar { position: sticky; top: 0; z-index: 2147483646; background: #0f172a; color: #f8fafc; padding: 12px 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; border-bottom: 2px solid #f97316; font: 13px/1.3 ui-sans-serif,system-ui,-apple-system,sans-serif; }
  #monsterindex-selector-toolbar strong { color: #fb923c; }
  #monsterindex-selector-toolbar .monsterindex-selector-meta { display: flex; flex-direction: column; gap: 2px; min-width: 260px; }
  #monsterindex-selector-toolbar .monsterindex-selector-note { color: #cbd5e1; font-size: 12px; }
  #monsterindex-selector-toolbar form { display: flex; gap: 8px; align-items: center; flex: 1 1 460px; min-width: 260px; }
  #monsterindex-selector-toolbar input[type="url"] { flex: 1 1 auto; min-width: 220px; border: 1px solid #334155; border-radius: 6px; padding: 7px 9px; background: #0b1220; color: #f8fafc; }
  #monsterindex-selector-toolbar button, #monsterindex-selector-back { border: 1px solid #334155; background: #1e293b; color: #f8fafc; border-radius: 6px; padding: 7px 10px; cursor: pointer; text-decoration: none; }
  #monsterindex-selector-toolbar button:hover { background: #334155; }
  #monsterindex-selector-back:hover { background: #334155; }
</style>
<div id="monsterindex-selector-toolbar" data-monsterindex-ignore="true">
  <div class="monsterindex-selector-meta">
    <strong>{$headerLabel}: {$escapedMonitorName}</strong>
    <span class="monsterindex-selector-note">{$stayMessage}</span>
  </div>
  <form method="get" action="{$escapedActionUrl}">
    <input type="hidden" name="token" value="{$escapedToken}">
    <input type="hidden" name="lang" value="{$escapedLang}">
    <input type="url" name="url" value="{$escapedCurrentUrl}" placeholder="{$inputPlaceholder}" required>
    <button type="submit">{$openUrlLabel}</button>
  </form>
  <a id="monsterindex-selector-back" href="{$escapedReturnUrl}" data-monsterindex-ignore="true">{$backLabel}</a>
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

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.closest('[data-monsterindex-ignore="true"]')) return;

      event.preventDefault();
      event.stopPropagation();
      window.alert({$formBlockedMessage});
    }, true);

    const backLink = document.getElementById('monsterindex-selector-back');
    if (backLink) {
      backLink.addEventListener('click', (event) => {
        if (window.__monsterindex_selector_unsaved && !window.confirm({$unsavedLeaveMessage})) {
          event.preventDefault();
        }
      });
    }
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

    private function translate(string $lang, string $english, string $dutch): string
    {
        return $lang === 'nl' ? $dutch : $english;
    }
}
