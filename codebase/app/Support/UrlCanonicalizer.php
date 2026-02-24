<?php

namespace App\Support;

class UrlCanonicalizer
{
    public static function canonicalize(?string $url): ?string
    {
        if (! is_string($url)) {
            return null;
        }

        $url = trim($url);
        if ($url === '') {
            return null;
        }

        $parts = parse_url($url);
        if (! is_array($parts)) {
            return null;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? 'https'));
        if (! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        $host = strtolower((string) ($parts['host'] ?? ''));
        if ($host === '') {
            return null;
        }

        if (str_starts_with($host, 'www.')) {
            $host = substr($host, 4);
        }

        $path = (string) ($parts['path'] ?? '/');
        $path = $path === '' ? '/' : $path;
        $path = '/'.ltrim($path, '/');
        if ($path !== '/') {
            $path = rtrim($path, '/');
        }

        $queryParams = [];
        parse_str((string) ($parts['query'] ?? ''), $queryParams);
        if (is_array($queryParams) && $queryParams !== []) {
            $queryParams = array_filter(
                $queryParams,
                static function ($value, $key): bool {
                    $key = strtolower((string) $key);
                    if ($value === null || $value === '') {
                        return false;
                    }

                    if (str_starts_with($key, 'utm_')) {
                        return false;
                    }

                    return ! in_array($key, [
                        'fbclid',
                        'gclid',
                        'mc_cid',
                        'mc_eid',
                        'ref',
                        'ref_',
                        'source',
                    ], true);
                },
                ARRAY_FILTER_USE_BOTH,
            );
            ksort($queryParams);
        }

        $query = $queryParams === [] ? '' : http_build_query($queryParams, arg_separator: '&', encoding_type: PHP_QUERY_RFC3986);
        $port = (int) ($parts['port'] ?? 0);
        $withPort = $port > 0 && ! (($scheme === 'https' && $port === 443) || ($scheme === 'http' && $port === 80))
            ? ':'.$port
            : '';

        return sprintf(
            '%s://%s%s%s%s',
            $scheme,
            $host,
            $withPort,
            $path,
            $query !== '' ? '?'.$query : '',
        );
    }
}
