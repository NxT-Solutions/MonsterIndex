<?php

namespace Packages\Analytics\Support;

class TrafficClassifier
{
    public function pageKindForPath(string $path): string
    {
        if ($path === '/') {
            return 'landing';
        }

        return match (true) {
            str_starts_with($path, '/admin') => 'admin',
            str_starts_with($path, '/contribute') => 'contribute',
            str_starts_with($path, '/dashboard') => 'dashboard',
            str_starts_with($path, '/monsters/') => 'monster',
            str_starts_with($path, '/login'),
            str_starts_with($path, '/register') => 'auth',
            default => 'public',
        };
    }

    public function channelForReferrer(
        ?string $referrerUrl,
        ?string $utmSource,
        ?string $utmMedium,
        string $currentHost,
    ): string {
        $medium = strtolower(trim((string) $utmMedium));
        $source = strtolower(trim((string) $utmSource));
        $referrerHost = strtolower((string) $this->extractHost($referrerUrl));
        $normalizedCurrentHost = strtolower($currentHost);

        if ($medium !== '') {
            if (str_contains($medium, 'email') || str_contains($medium, 'newsletter')) {
                return 'email';
            }

            if (str_contains($medium, 'social')) {
                return 'social';
            }

            if (str_contains($medium, 'cpc') || str_contains($medium, 'paid')) {
                return 'paid';
            }
        }

        if ($source !== '') {
            if ($this->containsAny($source, ['google', 'bing', 'duckduckgo', 'yahoo'])) {
                return 'search';
            }

            if ($this->containsAny($source, ['twitter', 'x', 'facebook', 'instagram', 'reddit', 'tiktok', 'linkedin', 'youtube'])) {
                return 'social';
            }

            if ($this->containsAny($source, ['email', 'newsletter', 'mailchimp'])) {
                return 'email';
            }
        }

        if ($referrerHost === '') {
            return 'direct';
        }

        if ($normalizedCurrentHost !== '' && $referrerHost === $normalizedCurrentHost) {
            return 'internal';
        }

        if ($this->containsAny($referrerHost, ['google.', 'bing.', 'duckduckgo.', 'yahoo.'])) {
            return 'search';
        }

        if ($this->containsAny($referrerHost, ['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'reddit.com', 'tiktok.com', 'linkedin.com', 'youtube.com'])) {
            return 'social';
        }

        if ($this->containsAny($referrerHost, ['mail.', 'outlook.', 'gmail.', 'proton.'])) {
            return 'email';
        }

        return 'referral';
    }

    /**
     * @return array{device_type: string, browser_family: string, os_family: string}
     */
    public function parseUserAgent(?string $userAgent): array
    {
        $agent = strtolower(trim((string) $userAgent));

        $deviceType = match (true) {
            $agent === '' => 'unknown',
            str_contains($agent, 'ipad'),
            str_contains($agent, 'tablet') => 'tablet',
            str_contains($agent, 'mobile'),
            str_contains($agent, 'iphone'),
            str_contains($agent, 'android') => 'mobile',
            default => 'desktop',
        };

        $browserFamily = match (true) {
            $agent === '' => 'Unknown',
            str_contains($agent, 'edg/') => 'Edge',
            str_contains($agent, 'opr/') || str_contains($agent, 'opera') => 'Opera',
            str_contains($agent, 'chrome/') && ! str_contains($agent, 'edg/') => 'Chrome',
            str_contains($agent, 'firefox/') => 'Firefox',
            str_contains($agent, 'safari/') && ! str_contains($agent, 'chrome/') => 'Safari',
            default => 'Other',
        };

        $osFamily = match (true) {
            $agent === '' => 'Unknown',
            str_contains($agent, 'iphone'),
            str_contains($agent, 'ipad'),
            str_contains($agent, 'ios') => 'iOS',
            str_contains($agent, 'android') => 'Android',
            str_contains($agent, 'mac os') || str_contains($agent, 'macintosh') => 'macOS',
            str_contains($agent, 'windows') => 'Windows',
            str_contains($agent, 'linux') => 'Linux',
            default => 'Other',
        };

        return [
            'device_type' => $deviceType,
            'browser_family' => $browserFamily,
            'os_family' => $osFamily,
        ];
    }

    public function extractHost(?string $url): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? strtolower($host) : null;
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }
}
