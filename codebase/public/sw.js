const CACHE_NAME = 'monsterindex-pwa-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
    OFFLINE_URL,
    '/site.webmanifest',
    '/favicon.svg',
    '/favicon-32x32.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key)),
            ),
        ),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });

                    return response;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return caches.match(OFFLINE_URL);
                }),
        );

        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request)),
    );
});

self.addEventListener('push', (event) => {
    let payload = {
        title: 'MonsterIndex',
        body: 'You have a new notification.',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        url: '/dashboard',
        tag: 'monsterindex-default',
        data: {},
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            payload = {
                ...payload,
                ...parsed,
                data: {
                    ...(payload.data || {}),
                    ...(parsed.data || {}),
                },
            };
        } catch (error) {
            payload.body = event.data.text();
        }
    }

    const targetUrl = typeof payload.url === 'string' && payload.url !== ''
        ? payload.url
        : '/dashboard';

    event.waitUntil(
        self.registration.showNotification(payload.title || 'MonsterIndex', {
            body: payload.body || '',
            icon: payload.icon || '/android-chrome-192x192.png',
            badge: payload.badge || '/favicon-32x32.png',
            tag: payload.tag || 'monsterindex-default',
            data: {
                ...(payload.data || {}),
                url: targetUrl,
            },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification?.data?.url || '/dashboard';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client && client.url.includes(targetUrl)) {
                    return client.focus();
                }
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }

            return undefined;
        }),
    );
});

