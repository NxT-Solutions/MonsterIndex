<?php

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;

it('redirects guests to google oauth provider', function () {
    $provider = \Mockery::mock(Provider::class);
    $provider->shouldReceive('stateless')->once()->andReturnSelf();
    $provider->shouldReceive('redirect')->once()->andReturn(new RedirectResponse('https://accounts.google.com/o/oauth2/v2/auth'));

    Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

    $this->get(route('auth.google.redirect'))
        ->assertRedirect('https://accounts.google.com/o/oauth2/v2/auth');
});

it('creates a user from google callback and logs them in', function () {
    config()->set('authz.admin_emails', ['admin@example.com']);

    $provider = \Mockery::mock(Provider::class);
    $socialiteUser = \Mockery::mock(SocialiteUser::class);

    $provider->shouldReceive('stateless')->once()->andReturnSelf();
    $provider->shouldReceive('user')->once()->andReturn($socialiteUser);
    Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

    $socialiteUser->shouldReceive('getId')->andReturn('google-123');
    $socialiteUser->shouldReceive('getEmail')->andReturn('admin@example.com');
    $socialiteUser->shouldReceive('getName')->andReturn('Admin User');
    $socialiteUser->shouldReceive('getNickname')->andReturn(null);
    $socialiteUser->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.png');

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticated();

    $user = User::query()->first();

    expect($user)->not->toBeNull()
        ->and($user->google_id)->toBe('google-123')
        ->and($user->email)->toBe('admin@example.com')
        ->and($user->role)->toBe(User::ROLE_ADMIN);
});

it('links existing user by email and updates google profile fields', function () {
    config()->set('authz.admin_emails', []);

    $existingUser = User::factory()->create([
        'email' => 'existing@example.com',
        'google_id' => null,
        'role' => User::ROLE_ADMIN,
    ]);

    $provider = \Mockery::mock(Provider::class);
    $socialiteUser = \Mockery::mock(SocialiteUser::class);

    $provider->shouldReceive('stateless')->once()->andReturnSelf();
    $provider->shouldReceive('user')->once()->andReturn($socialiteUser);
    Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

    $socialiteUser->shouldReceive('getId')->andReturn('google-existing');
    $socialiteUser->shouldReceive('getEmail')->andReturn('existing@example.com');
    $socialiteUser->shouldReceive('getName')->andReturn('Existing User');
    $socialiteUser->shouldReceive('getNickname')->andReturn(null);
    $socialiteUser->shouldReceive('getAvatar')->andReturn('https://example.com/existing.png');

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('dashboard', absolute: false));

    $existingUser->refresh();

    expect($existingUser->google_id)->toBe('google-existing')
        ->and($existingUser->avatar_url)->toBe('https://example.com/existing.png')
        ->and($existingUser->role)->toBe(User::ROLE_USER);
});

it('rejects callback when google does not provide an email', function () {
    $provider = \Mockery::mock(Provider::class);
    $socialiteUser = \Mockery::mock(SocialiteUser::class);

    $provider->shouldReceive('stateless')->once()->andReturnSelf();
    $provider->shouldReceive('user')->once()->andReturn($socialiteUser);
    Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

    $socialiteUser->shouldReceive('getEmail')->andReturn(null);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
    expect(User::query()->count())->toBe(0);
});
