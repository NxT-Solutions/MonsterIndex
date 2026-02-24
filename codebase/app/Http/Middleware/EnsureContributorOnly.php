<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureContributorOnly
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response|RedirectResponse
    {
        $user = $request->user();
        if ($user instanceof User && $user->can('admin.access')) {
            if ($request->expectsJson() || ! $request->isMethodSafe()) {
                abort(403);
            }

            return redirect()->route('admin.dashboard');
        }

        return $next($request);
    }
}
