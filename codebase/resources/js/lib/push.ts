import axios from 'axios';

const SERVICE_WORKER_PATH = '/sw.js';

type PushSubscribeResponse = {
    ok: boolean;
    id: number;
    endpoint: string;
};

type VapidResponse = {
    public_key: string;
};

export function isPushSupported(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!isPushSupported()) {
        return null;
    }

    try {
        const existing = await navigator.serviceWorker.getRegistration('/');
        if (existing) {
            return existing;
        }

        return await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: '/' });
    } catch {
        return null;
    }
}

export async function enablePushNotifications(): Promise<{
    ok: boolean;
    endpoint: string | null;
    permission: NotificationPermission | 'unsupported';
}> {
    if (!isPushSupported()) {
        return {
            ok: false,
            endpoint: null,
            permission: 'unsupported',
        };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
        return {
            ok: false,
            endpoint: null,
            permission: Notification.permission,
        };
    }

    let permission = Notification.permission;
    if (permission === 'default') {
        permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
        return {
            ok: false,
            endpoint: null,
            permission,
        };
    }

    const vapidPublicKey = await fetchVapidPublicKey();
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const payload = subscription.toJSON();
    const response = await axios.post<PushSubscribeResponse>(
        route('api.push.subscriptions.store'),
        payload,
    );

    return {
        ok: response.data.ok,
        endpoint: response.data.endpoint ?? payload.endpoint ?? null,
        permission,
    };
}

export async function disablePushNotifications(): Promise<{
    ok: boolean;
}> {
    if (!isPushSupported()) {
        return { ok: false };
    }

    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

    if (!subscription) {
        return { ok: true };
    }

    await axios.delete(route('api.push.subscriptions.destroy'), {
        data: {
            endpoint: subscription.endpoint,
        },
    });
    await subscription.unsubscribe();

    return { ok: true };
}

async function fetchVapidPublicKey(): Promise<string> {
    const response = await axios.get<VapidResponse>(route('api.push.vapid-public-key'));

    return response.data.public_key;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}
