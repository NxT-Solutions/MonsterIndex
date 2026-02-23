<?php

namespace Packages\Monitoring\Services;

use Illuminate\Support\Facades\Cache;

class DomainRateLimiter
{
    public function secondsUntilAvailable(string $domain, int $minimumIntervalSeconds = 30): int
    {
        $normalized = strtolower(trim($domain));
        if ($normalized === '') {
            return 0;
        }

        $key = 'domain-rate:'.sha1($normalized);
        $lastSeen = Cache::get($key);

        $now = now()->timestamp;
        if (is_numeric($lastSeen)) {
            $lastSeenInt = (int) $lastSeen;
            $elapsed = $now - $lastSeenInt;
            if ($elapsed < $minimumIntervalSeconds) {
                return $minimumIntervalSeconds - $elapsed;
            }
        }

        Cache::put($key, $now, now()->addMinutes(10));

        return 0;
    }
}
