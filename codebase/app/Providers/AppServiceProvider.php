<?php

namespace App\Providers;

use App\Models\Monitor;
use App\Models\MonsterSuggestion;
use App\Policies\MonitorPolicy;
use App\Policies\MonsterSuggestionPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        Gate::policy(Monitor::class, MonitorPolicy::class);
        Gate::policy(MonsterSuggestion::class, MonsterSuggestionPolicy::class);

        RateLimiter::for('monitor-create', function (Request $request): array {
            $key = $this->throttleKey($request);

            return [
                Limit::perHour(6)->by($key),
                Limit::perDay(20)->by($key),
            ];
        });

        RateLimiter::for('monitor-submit', function (Request $request): Limit {
            return Limit::perHour(10)->by($this->throttleKey($request));
        });

        RateLimiter::for('suggestion-create', function (Request $request): Limit {
            return Limit::perDay(3)->by($this->throttleKey($request));
        });

        RateLimiter::for('selector-actions', function (Request $request): Limit {
            return Limit::perMinute(30)->by($this->throttleKey($request));
        });

        RateLimiter::for('bookmarklet-capture', function (Request $request): Limit {
            $token = (string) ($request->input('token') ?: $request->query('token') ?: 'no-token');
            $ip = (string) ($request->ip() ?: 'no-ip');

            return Limit::perMinute(30)->by($token.'|'.$ip);
        });
    }

    private function throttleKey(Request $request): string
    {
        $userPart = $request->user()?->id ? 'u:'.$request->user()->id : 'u:guest';
        $ipPart = $request->ip() ? 'ip:'.$request->ip() : 'ip:unknown';

        return $userPart.'|'.$ipPart;
    }
}
