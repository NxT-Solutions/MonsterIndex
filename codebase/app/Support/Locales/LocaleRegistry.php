<?php

namespace App\Support\Locales;

class LocaleRegistry
{
    public static function cookieName(): string
    {
        return (string) config('locales.cookie_name', 'monsterindex_locale');
    }

    public static function fallback(): string
    {
        return (string) config('locales.fallback', 'en');
    }

    /**
     * @return array<string, array{name?: string, native_name?: string, dir?: string, bcp47?: string}>
     */
    public static function supported(): array
    {
        $supported = config('locales.supported', []);

        return is_array($supported) ? $supported : [];
    }

    /**
     * @return list<string>
     */
    public static function supportedCodes(): array
    {
        return array_keys(self::supported());
    }

    public static function resolve(?string $candidate): string
    {
        if (is_string($candidate) && in_array($candidate, self::supportedCodes(), true)) {
            return $candidate;
        }

        return self::fallback();
    }

    /**
     * @return array<string, string>
     */
    public static function messages(?string $candidate = null): array
    {
        $locale = self::resolve($candidate);
        $path = lang_path($locale.'.json');

        if (! is_file($path)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? $decoded : [];
    }
}
