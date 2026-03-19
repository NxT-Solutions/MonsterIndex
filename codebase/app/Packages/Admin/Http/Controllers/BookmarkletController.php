<?php

namespace Packages\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Support\Locales\LocaleRegistry;
use App\Support\Authorization\PermissionBootstrapper;
use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Packages\Bookmarklet\Services\BookmarkletSessionService;
use Throwable;

class BookmarkletController extends Controller
{
    public function __construct(
        private readonly BookmarkletSessionService $bookmarkletSessionService,
    ) {}

    public function session(Request $request): JsonResponse
    {
        if ($request->user()) {
            PermissionBootstrapper::syncUserFromLegacyRole($request->user());
        }

        $validated = $request->validate([
            'monitor_id' => ['required', 'integer', 'exists:monitors,id'],
            'lang' => ['nullable', Rule::in(LocaleRegistry::supportedCodes())],
        ]);

        $monitor = Monitor::query()->findOrFail($validated['monitor_id']);
        $this->authorize('update', $monitor);
        $session = $this->bookmarkletSessionService->create($monitor, $request->user());
        $lang = LocaleRegistry::resolve($validated['lang'] ?? null);

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
        if ($request->user()) {
            PermissionBootstrapper::syncUserFromLegacyRole($request->user());
        }

        $monitor->loadMissing('monster');

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'url' => ['nullable', 'url', 'max:2048'],
            'lang' => ['nullable', Rule::in(LocaleRegistry::supportedCodes())],
        ]);
        $lang = LocaleRegistry::resolve($validated['lang'] ?? null);

        $session = $this->bookmarkletSessionService->resolveValidToken($validated['token']);
        abort_unless(
            $session !== null
            && (int) $session->monitor_id === (int) $monitor->id
            && (int) $session->created_by_user_id === (int) $request->user()->id,
            403,
            __('Selector token is invalid or expired.', [], $lang),
        );

        $this->authorize('update', $monitor);

        $targetUrl = $validated['url'] ?: $monitor->product_url;
        if (! $this->supportsUrl($targetUrl)) {
            abort(422, __('Only HTTP/HTTPS URLs are supported.', [], $lang));
        }

        $html = $this->fetchHtml($targetUrl);
        if ($html === null) {
            $message = __('Failed to fetch the target page. Check URL, anti-bot protection, or try another page.', [], $lang);

            return response($this->renderErrorDocument($message, $lang), 502, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            ]);
        }

        $html = $this->prepareHtmlForSelectorBrowser($html);

        $user = $request->user();
        $isAdmin = $user?->can('monitors.manage.any') ?? false;
        $returnUrl = $isAdmin
            ? ($monitor->monster
                ? route('admin.monsters.show', [
                    'monster' => $monitor->monster->slug,
                    'lang' => $lang,
                ], absolute: true)
                : route('admin.monsters.index', ['lang' => $lang], absolute: true))
            : route('contribute.monitors.index', ['lang' => $lang], absolute: true);

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
            monitorName: $monitor->monster?->name ?: __('Monitor', [], $lang),
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

    public function script(Request $request): Response
    {
        $lang = LocaleRegistry::resolve($request->query('lang'));
        $script = (string) file_get_contents(resource_path('js/bookmarklet/selector.js'));
        $serializedLocale = json_encode($lang, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $serializedMessages = json_encode(
            LocaleRegistry::messages($lang),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );

        if (! is_string($serializedLocale)) {
            $serializedLocale = '"en"';
        }

        if (! is_string($serializedMessages)) {
            $serializedMessages = '{}';
        }

        $script = <<<JS
const __monsterindexLocale = {$serializedLocale};
const __monsterindexLocaleMessages = {$serializedMessages};
{$script}
JS;

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
            __('Selector Browser Error', [], $lang),
            ENT_QUOTES,
            'UTF-8',
        );
        $header = htmlspecialchars(
            __('MonsterIndex Selector Browser', [], $lang),
            ENT_QUOTES,
            'UTF-8',
        );
        $docLang = htmlspecialchars(LocaleRegistry::resolve($lang), ENT_QUOTES, 'UTF-8');

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
        $escapedLang = htmlspecialchars(LocaleRegistry::resolve($lang), ENT_QUOTES, 'UTF-8');
        $headerLabel = htmlspecialchars(
            __('Guided Selector Setup', [], $lang),
            ENT_QUOTES,
            'UTF-8',
        );
        $stayMessage = htmlspecialchars(
            __('Stay on this page while selecting. We keep navigation in selector mode until you save.', [], $lang),
            ENT_QUOTES,
            'UTF-8',
        );
        $inputPlaceholder = htmlspecialchars(
            __('https://example.com/product-url', [], $lang),
            ENT_QUOTES,
            'UTF-8',
        );
        $openUrlLabel = htmlspecialchars(
            __('Open URL', [], $lang),
            ENT_QUOTES,
            'UTF-8',
        );
        $backLabel = htmlspecialchars(
            __('Back to Admin', [], $lang),
            ENT_QUOTES,
            'UTF-8',
        );
        $formBlockedMessage = json_encode(
            __('Form submission is disabled in selector mode. Use the URL field in the top bar to navigate safely.', [], $lang),
        );
        $unsavedLeaveMessage = json_encode(
            __('You still have unsaved selector changes. Leave anyway?', [], $lang),
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
  [x-cloak] { display: none !important; }
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

    private function prepareHtmlForSelectorBrowser(string $html): string
    {
        $document = $this->createSelectorBrowserDocument($html);
        if (! $document) {
            return $html;
        }

        $xpath = new DOMXPath($document);

        $scriptNodes = $xpath->query('//script');
        if ($scriptNodes !== false) {
            foreach ($this->nodesToArray($scriptNodes) as $scriptNode) {
                $scriptNode->parentNode?->removeChild($scriptNode);
            }
        }

        $templateNodes = $xpath->query('//template[@x-if]');
        if ($templateNodes !== false) {
            foreach ($this->nodesToArray($templateNodes) as $templateNode) {
                $parent = $templateNode->parentNode;
                if (! $parent instanceof DOMNode) {
                    continue;
                }

                while ($templateNode->firstChild) {
                    if ($templateNode->firstChild instanceof DOMElement) {
                        $templateNode->firstChild->setAttribute(
                            'data-monsterindex-unwrapped-template-root',
                            'true',
                        );
                    }

                    $parent->insertBefore($templateNode->firstChild, $templateNode);
                }

                $parent->removeChild($templateNode);
            }
        }

        $serialized = $document->saveHTML();
        if (! is_string($serialized) || trim($serialized) === '') {
            return $html;
        }

        return (string) preg_replace('/<\?xml[^>]+>\s*/', '', $serialized, 1);
    }

    private function createSelectorBrowserDocument(string $html): ?DOMDocument
    {
        if (trim($html) === '') {
            return null;
        }

        $internalErrors = libxml_use_internal_errors(true);

        $document = new DOMDocument('1.0', 'UTF-8');
        $loaded = $document->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NOERROR | LIBXML_NOWARNING);

        libxml_clear_errors();
        libxml_use_internal_errors($internalErrors);

        return $loaded ? $document : null;
    }

    /**
     * @return list<DOMNode>
     */
    private function nodesToArray(\DOMNodeList $nodes): array
    {
        $items = [];

        foreach ($nodes as $node) {
            if ($node instanceof DOMNode) {
                $items[] = $node;
            }
        }

        return $items;
    }
}
