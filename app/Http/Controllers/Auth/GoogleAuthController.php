<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to the Google OAuth page.
     */
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Handle the OAuth callback from Google.
     */
    public function callback(): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->stateless()->user();
        $email = $googleUser->getEmail();

        if (! $email) {
            return redirect()->route('login')->withErrors([
                'google' => 'Google did not return an email address for this account.',
            ]);
        }

        $user = User::query()
            ->where('google_id', $googleUser->getId())
            ->orWhere('email', $email)
            ->first();

        $attributes = [
            'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Google User',
            'email' => $email,
            'google_id' => $googleUser->getId(),
            'avatar_url' => $googleUser->getAvatar(),
            'role' => $this->resolveRole($email),
        ];

        if ($user) {
            $user->fill($attributes)->save();
        } else {
            $user = User::query()->create($attributes);
        }

        Auth::login($user, true);
        request()->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    private function resolveRole(string $email): string
    {
        $adminEmails = collect(config('authz.admin_emails', []))
            ->map(fn (string $item): string => mb_strtolower(trim($item)))
            ->filter();

        return $adminEmails->contains(mb_strtolower($email))
            ? User::ROLE_ADMIN
            : User::ROLE_USER;
    }
}
