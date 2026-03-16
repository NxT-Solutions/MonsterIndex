import axios from 'axios';

const SERVICE_WORKER_PATH = '/sw.js';

export type PushPermissionState = NotificationPermission | 'unsupported';

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

    return window.isSecureContext
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window;
}

export function getPushPermissionState(): PushPermissionState {
    if (!isPushSupported()) {
        return 'unsupported';
    }

    return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!isPushSupported()) {
        return null;
    }

    try {
        const existing = await navigator.serviceWorker.getRegistration('/');
        if (existing?.active) {
            return existing;
        }

        if (existing) {
            return await navigator.serviceWorker.ready;
        }

        await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: '/' });

        return await navigator.serviceWorker.ready;
    } catch {
        return null;
    }
}

export async function enablePushNotifications(): Promise<{
    ok: boolean;
    endpoint: string | null;
    permission: PushPermissionState;
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
            permission: getPushPermissionState(),
        };
    }

    const permission = await Notification.requestPermission();

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
    permission: PushPermissionState;
    browserPermissionRevoked: boolean;
}> {
    if (!isPushSupported()) {
        return {
            ok: false,
            permission: 'unsupported',
            browserPermissionRevoked: false,
        };
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    const registration = registrations[0] ?? null;
    const subscription = registration ? await registration.pushManager.getSubscription() : null;

    if (subscription) {
        await axios.delete(route('api.push.subscriptions.destroy'), {
            data: {
                endpoint: subscription.endpoint,
            },
        });
        await subscription.unsubscribe();
    }

    const permission = Notification.permission;

    return {
        ok: true,
        permission,
        browserPermissionRevoked: permission === 'default',
    };
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
