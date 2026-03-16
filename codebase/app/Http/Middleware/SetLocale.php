<?php

namespace App\Http\Middleware;

use App\Support\Locales\LocaleRegistry;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $supported = LocaleRegistry::supportedCodes();
        $fallback = LocaleRegistry::fallback();
        $cookieName = LocaleRegistry::cookieName();

        $locale = $request->query('lang');

        if (! in_array($locale, $supported, true)) {
            $locale = $request->cookie($cookieName);
        }

        if (! in_array($locale, $supported, true)) {
            $locale = $this->resolveFromAcceptLanguage(
                (string) $request->header('Accept-Language', ''),
                $supported,
                $fallback,
            );
        }

        App::setLocale($locale);

        return $next($request);
    }

    /**
     * Resolve locale from the Accept-Language header.
     *
     * @param  array<int, string>  $supported
     */
    private function resolveFromAcceptLanguage(
        string $header,
        array $supported,
        string $fallback,
    ): string {
        if ($header === '') {
            return $fallback;
        }

        foreach (explode(',', strtolower($header)) as $candidate) {
            $locale = trim(explode(';', $candidate)[0] ?? '');
            $short = substr($locale, 0, 2);

            if (in_array($short, $supported, true)) {
                return $short;
            }
        }

        return $fallback;
    }
}
