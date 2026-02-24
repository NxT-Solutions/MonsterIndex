<?php

namespace Packages\Notifications\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Collection;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    public function vapidPublicKey(): ?string
    {
        $value = config('webpush.vapid.public_key');

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    public function hasValidConfiguration(): bool
    {
        return $this->vapidPublicKey() !== null
            && is_string(config('webpush.vapid.private_key'))
            && trim((string) config('webpush.vapid.private_key')) !== ''
            && is_string(config('webpush.vapid.subject'))
            && trim((string) config('webpush.vapid.subject')) !== '';
    }

    /**
     * @param  array<string, mixed>  $notification
     * @return array{success_count: int, failure_count: int, invalid_endpoints: list<string>}
     */
    public function sendToUser(User $user, array $notification): array
    {
        $subscriptions = $user->pushSubscriptions()->get();

        return $this->sendToSubscriptions($subscriptions, $notification);
    }

    /**
     * @param  Collection<int, PushSubscription>  $subscriptions
     * @param  array<string, mixed>  $notification
     * @return array{success_count: int, failure_count: int, invalid_endpoints: list<string>}
     */
    public function sendToSubscriptions(Collection $subscriptions, array $notification): array
    {
        if ($subscriptions->isEmpty()) {
            return [
                'success_count' => 0,
                'failure_count' => 0,
                'invalid_endpoints' => [],
            ];
        }

        if (! $this->hasValidConfiguration()) {
            return [
                'success_count' => 0,
                'failure_count' => $subscriptions->count(),
                'invalid_endpoints' => [],
            ];
        }

        $payload = json_encode($notification, JSON_THROW_ON_ERROR);

        $successCount = 0;
        $failureCount = 0;
        $invalidEndpoints = [];
        foreach ($this->dispatchNotificationBatch($subscriptions, $payload) as $report) {
            if ($report->isSuccess()) {
                $successCount++;

                continue;
            }

            $failureCount++;
            $endpoint = (string) $report->getEndpoint();
            $response = $report->getResponse();
            $statusCode = $response?->getStatusCode();
            if ($report->isSubscriptionExpired() || $statusCode === 404 || $statusCode === 410) {
                $invalidEndpoints[] = $endpoint;
            }
        }

        $invalidEndpoints = array_values(array_unique(array_filter($invalidEndpoints)));
        if ($invalidEndpoints !== []) {
            PushSubscription::query()
                ->whereIn('endpoint', $invalidEndpoints)
                ->delete();
        }

        return [
            'success_count' => $successCount,
            'failure_count' => $failureCount,
            'invalid_endpoints' => $invalidEndpoints,
        ];
    }

    /**
     * @param  Collection<int, PushSubscription>  $subscriptions
     * @return iterable<int, mixed>
     */
    protected function dispatchNotificationBatch(Collection $subscriptions, string $payload): iterable
    {
        $webPush = new WebPush([
            'VAPID' => [
                'subject' => (string) config('webpush.vapid.subject'),
                'publicKey' => (string) config('webpush.vapid.public_key'),
                'privateKey' => (string) config('webpush.vapid.private_key'),
            ],
        ]);

        foreach ($subscriptions as $subscription) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->p256dh,
                    'authToken' => $subscription->auth,
                    'contentEncoding' => $subscription->content_encoding ?: 'aesgcm',
                ]),
                $payload,
            );
        }

        return $webPush->flush();
    }
}
