<?php

use App\Models\Alert;
use App\Models\ContributorAlert;
use App\Models\Monitor;
use App\Models\Monster;
use App\Models\PriceSnapshot;
use App\Models\PushSubscription;
use App\Models\Site;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Queue;
use Packages\Notifications\Jobs\DispatchAlertPushJob;
use Packages\Notifications\Jobs\DispatchContributorAlertPushJob;
use Packages\Notifications\Services\ContributorAlertPushService;
use Packages\Notifications\Services\WebPushService;

it('allows authenticated users to upsert and delete push subscriptions', function () {
    $user = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($user, false);

    $payload = validSubscriptionPayload('https://push.example.test/endpoint-1');

    $this->actingAs($user)
        ->postJson(route('api.push.subscriptions.store'), $payload)
        ->assertOk()
        ->assertJsonPath('ok', true);

    $this->assertDatabaseHas('push_subscriptions', [
        'user_id' => $user->id,
        'endpoint' => $payload['endpoint'],
    ]);

    $updatedPayload = validSubscriptionPayload($payload['endpoint']);
    $updatedPayload['keys']['p256dh'] = 'updated-key';

    $this->actingAs($user)
        ->postJson(route('api.push.subscriptions.store'), $updatedPayload)
        ->assertOk();

    expect(PushSubscription::query()->where('endpoint', $payload['endpoint'])->count())
        ->toBe(1)
        ->and(PushSubscription::query()->where('endpoint', $payload['endpoint'])->first()?->p256dh)
        ->toBe('updated-key');

    $this->actingAs($user)
        ->deleteJson(route('api.push.subscriptions.destroy'), [
            'endpoint' => $payload['endpoint'],
        ])
        ->assertOk()
        ->assertJsonPath('deleted', 1);

    $this->assertDatabaseMissing('push_subscriptions', [
        'endpoint' => $payload['endpoint'],
    ]);
});

it('lists the authenticated users push subscriptions for device management', function () {
    $user = User::factory()->create(['role' => User::ROLE_USER]);
    $otherUser = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($user, false);
    PermissionBootstrapper::syncUserRole($otherUser, false);

    PushSubscription::query()->create([
        'user_id' => $user->id,
        'endpoint' => 'https://push.example.test/phone',
        'p256dh' => 'phone-key',
        'auth' => 'phone-auth',
        'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1',
    ]);
    PushSubscription::query()->create([
        'user_id' => $user->id,
        'endpoint' => 'https://push.example.test/laptop',
        'p256dh' => 'laptop-key',
        'auth' => 'laptop-auth',
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36',
    ]);
    PushSubscription::query()->create([
        'user_id' => $otherUser->id,
        'endpoint' => 'https://push.example.test/other-user',
        'p256dh' => 'other-key',
        'auth' => 'other-auth',
        'user_agent' => 'Mozilla/5.0',
    ]);

    $this->actingAs($user)
        ->getJson(route('api.push.subscriptions.index'))
        ->assertOk()
        ->assertJsonCount(2, 'subscriptions')
        ->assertJsonFragment([
            'endpoint' => 'https://push.example.test/phone',
            'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1',
        ])
        ->assertJsonFragment([
            'endpoint' => 'https://push.example.test/laptop',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36',
        ])
        ->assertJsonMissing([
            'endpoint' => 'https://push.example.test/other-user',
        ]);
});

it('rejects unauthenticated push subscription calls', function () {
    $this->getJson(route('api.push.subscriptions.index'))
        ->assertStatus(401);

    $this->postJson(route('api.push.subscriptions.store'), validSubscriptionPayload('https://push.example.test/public'))
        ->assertStatus(401);
});

it('throttles push subscription actions', function () {
    $user = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($user, false);

    foreach (range(1, 30) as $attempt) {
        $this->actingAs($user)
            ->postJson(route('api.push.subscriptions.store'), validSubscriptionPayload("https://push.example.test/t{$attempt}"))
            ->assertOk();
    }

    $this->actingAs($user)
        ->postJson(route('api.push.subscriptions.store'), validSubscriptionPayload('https://push.example.test/overflow'))
        ->assertStatus(429);
});

it('returns the vapid public key for authenticated users', function () {
    config()->set('webpush.vapid.public_key', 'PUBLIC_TEST_KEY');

    $user = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($user, false);

    $this->actingAs($user)
        ->getJson(route('api.push.vapid-public-key'))
        ->assertOk()
        ->assertJsonPath('public_key', 'PUBLIC_TEST_KEY');
});

it('denies push test endpoint to contributors and allows admins', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $target = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);
    PermissionBootstrapper::syncUserRole($admin, true);

    $this->actingAs($contributor)
        ->post(route('api.admin.push.test'), [
            'user_id' => $target->id,
            'title' => 'test',
            'body' => 'test body',
            'url' => '/dashboard',
        ])->assertForbidden();

    $mock = Mockery::mock(WebPushService::class);
    $mock->shouldReceive('sendToUser')
        ->once()
        ->andReturn([
            'success_count' => 1,
            'failure_count' => 0,
            'invalid_endpoints' => [],
        ]);
    $this->app->instance(WebPushService::class, $mock);

    $this->actingAs($admin)
        ->from(route('admin.dashboard'))
        ->post(route('api.admin.push.test'), [
            'user_id' => $target->id,
            'title' => 'Test notification',
            'body' => 'This is a test.',
            'url' => '/dashboard',
        ])->assertRedirect(route('admin.dashboard'));
});

it('allows admins to trigger a test alert from admin alerts and denies contributors', function () {
    Queue::fake();

    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    PermissionBootstrapper::syncUserRole($contributor, false);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monster = Monster::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => Site::factory()->create()->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
        'currency' => 'EUR',
    ]);

    $this->actingAs($contributor)
        ->post(route('admin.alerts.trigger-test'), [
            'monitor_id' => $monitor->id,
            'title' => 'Forbidden test',
            'body' => 'forbidden body',
        ])->assertForbidden();

    $this->actingAs($admin)
        ->from(route('admin.alerts.index'))
        ->post(route('admin.alerts.trigger-test'), [
            'monitor_id' => $monitor->id,
            'title' => 'Manual test alert',
            'body' => 'Manual test body',
        ])->assertRedirect(route('admin.alerts.index'));

    $this->assertDatabaseHas('alerts', [
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'type' => 'manual_test',
        'title' => 'Manual test alert',
        'body' => 'Manual test body',
    ]);

    Queue::assertPushed(DispatchAlertPushJob::class);
});

it('queues push dispatch when an in-app alert is created', function () {
    Queue::fake();

    $monster = Monster::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => Site::factory()->create()->id,
    ]);

    Alert::query()->create([
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'type' => 'new_best_price',
        'title' => 'New best',
        'body' => 'Body',
    ]);

    Queue::assertPushed(DispatchAlertPushJob::class);
});

it('queues push dispatch when a followed price-drop alert is created', function () {
    Queue::fake();

    $user = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($user, false);

    $monster = Monster::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => Site::factory()->create()->id,
    ]);
    $snapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'currency' => 'EUR',
        'effective_total_cents' => 2990,
    ]);

    ContributorAlert::query()->create([
        'user_id' => $user->id,
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'price_snapshot_id' => $snapshot->id,
        'type' => 'price_drop',
        'currency' => 'EUR',
        'effective_total_cents' => 2990,
        'title' => 'Drop',
        'body' => 'Body',
    ]);

    Queue::assertPushed(DispatchContributorAlertPushJob::class);
});

it('sends followed price-drop push notifications to admin followers', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monster = Monster::factory()->create();
    $monitor = Monitor::factory()->create([
        'monster_id' => $monster->id,
        'site_id' => Site::factory()->create()->id,
    ]);
    $snapshot = PriceSnapshot::factory()->create([
        'monitor_id' => $monitor->id,
        'currency' => 'EUR',
        'effective_total_cents' => 2590,
    ]);

    $alert = ContributorAlert::query()->create([
        'user_id' => $admin->id,
        'monster_id' => $monster->id,
        'monitor_id' => $monitor->id,
        'price_snapshot_id' => $snapshot->id,
        'type' => 'price_drop',
        'currency' => 'EUR',
        'effective_total_cents' => 2590,
        'title' => 'Price drop alert',
        'body' => 'Drop detected',
    ]);

    $mock = Mockery::mock(WebPushService::class);
    $mock->shouldReceive('hasValidConfiguration')
        ->once()
        ->andReturn(true);
    $mock->shouldReceive('sendToUser')
        ->once()
        ->withArgs(function (User $user, array $notification) use ($admin): bool {
            return $user->is($admin)
                && ($notification['url'] ?? null) === route('admin.alerts.index', absolute: false);
        })
        ->andReturn([
            'success_count' => 1,
            'failure_count' => 0,
            'invalid_endpoints' => [],
        ]);

    $this->app->instance(WebPushService::class, $mock);

    app(ContributorAlertPushService::class)->dispatchForAlertId($alert->id);
});

it('prunes invalid subscriptions returned by push delivery reports', function () {
    config()->set('webpush.vapid.public_key', 'PUBLIC_TEST_KEY');
    config()->set('webpush.vapid.private_key', 'PRIVATE_TEST_KEY');
    config()->set('webpush.vapid.subject', 'mailto:test@example.com');

    $user = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($user, false);

    PushSubscription::query()->create([
        'user_id' => $user->id,
        'endpoint' => 'https://push.example.test/invalid',
        'p256dh' => 'a',
        'auth' => 'b',
    ]);
    PushSubscription::query()->create([
        'user_id' => $user->id,
        'endpoint' => 'https://push.example.test/valid',
        'p256dh' => 'c',
        'auth' => 'd',
    ]);

    $service = new class extends WebPushService
    {
        /**
         * @param  Collection<int, PushSubscription>  $subscriptions
         * @return iterable<int, object>
         */
        protected function dispatchNotificationBatch(Collection $subscriptions, string $payload): iterable
        {
            return [
                new class
                {
                    public function isSuccess(): bool
                    {
                        return false;
                    }

                    public function getEndpoint(): string
                    {
                        return 'https://push.example.test/invalid';
                    }

                    public function isSubscriptionExpired(): bool
                    {
                        return true;
                    }

                    public function getResponse(): ?object
                    {
                        return null;
                    }
                },
                new class
                {
                    public function isSuccess(): bool
                    {
                        return true;
                    }

                    public function getEndpoint(): string
                    {
                        return 'https://push.example.test/valid';
                    }

                    public function isSubscriptionExpired(): bool
                    {
                        return false;
                    }

                    public function getResponse(): ?object
                    {
                        return null;
                    }
                },
            ];
        }
    };

    $result = $service->sendToSubscriptions(
        PushSubscription::query()->where('user_id', $user->id)->get(),
        [
            'title' => 'hello',
            'body' => 'world',
        ],
    );

    expect($result['success_count'])->toBe(1)
        ->and($result['failure_count'])->toBe(1)
        ->and($result['invalid_endpoints'])->toBe(['https://push.example.test/invalid']);

    $this->assertDatabaseMissing('push_subscriptions', [
        'endpoint' => 'https://push.example.test/invalid',
    ]);
    $this->assertDatabaseHas('push_subscriptions', [
        'endpoint' => 'https://push.example.test/valid',
    ]);
});

/**
 * @return array<string, mixed>
 */
function validSubscriptionPayload(string $endpoint): array
{
    return [
        'endpoint' => $endpoint,
        'keys' => [
            'p256dh' => 'BOw7Ff_fake_p256dh_key_value',
            'auth' => 'fake_auth_key',
        ],
        'expirationTime' => null,
    ];
}
