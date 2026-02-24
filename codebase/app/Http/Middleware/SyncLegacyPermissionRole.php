<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SyncLegacyPermissionRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user instanceof User) {
            PermissionBootstrapper::syncUserFromLegacyRole($user);
        }

        return $next($request);
    }
}
