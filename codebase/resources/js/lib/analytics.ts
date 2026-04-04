type PageViewPayload = {
    routeName: string | null;
    pageComponent: string;
    path: string;
    url: string;
    title: string;
    referrerUrl: string | null;
    locale: string | null;
    viewportWidth: number;
    viewportHeight: number;
};

type ActivePageView = {
    id: number;
    visitorId: string;
    browserSessionId: string;
    routeName: string | null;
    path: string;
    startedAt: number;
    maxScrollDepth: number;
    engaged: boolean;
};

type TrackEventPayload = {
    eventName: string;
    label?: string | null;
    targetUrl?: string | null;
    scrollDepth?: number | null;
    properties?: Record<string, unknown>;
};

const VISITOR_STORAGE_KEY = 'monsterindex_analytics_visitor_id';
const SESSION_STORAGE_KEY = 'monsterindex_analytics_session_id';

let activePageView: ActivePageView | null = null;
let pendingPageViewPromise: Promise<ActivePageView | null> | null = null;

export async function beginAnalyticsPageView(
    payload: PageViewPayload,
): Promise<ActivePageView | null> {
    if (typeof window === 'undefined') {
        return null;
    }

    const visitorId = readOrCreateStorageId(VISITOR_STORAGE_KEY, window.localStorage);
    const browserSessionId = readOrCreateStorageId(
        SESSION_STORAGE_KEY,
        window.sessionStorage,
    );

    const requestPayload = {
        visitor_id: visitorId,
        browser_session_id: browserSessionId,
        route_name: payload.routeName,
        page_component: payload.pageComponent,
        path: payload.path,
        url: payload.url,
        title: payload.title,
        referrer_url: payload.referrerUrl,
        locale: payload.locale,
        viewport_width: payload.viewportWidth,
        viewport_height: payload.viewportHeight,
    };

    const startTime = Date.now();

    pendingPageViewPromise = window.axios
        .post<{ id: number }>(route('analytics.page-views.store'), requestPayload, {
            headers: {
                Accept: 'application/json',
            },
        })
        .then(({ data }) => {
            const nextView: ActivePageView = {
                id: data.id,
                visitorId,
                browserSessionId,
                routeName: payload.routeName,
                path: payload.path,
                startedAt: startTime,
                maxScrollDepth: currentScrollDepth(),
                engaged: false,
            };

            activePageView = nextView;

            return nextView;
        })
        .catch(() => {
            activePageView = null;

            return null;
        })
        .finally(() => {
            pendingPageViewPromise = null;
        });

    return pendingPageViewPromise;
}

export async function flushActiveAnalyticsPageView(
    reason: 'navigate' | 'pagehide' | 'unmount' = 'navigate',
): Promise<void> {
    const view = await resolveActivePageView();
    if (!view) {
        return;
    }

    activePageView = null;

    const durationSeconds = Math.max(
        0,
        Math.round((Date.now() - view.startedAt) / 1000),
    );
    const maxScrollDepth = Math.max(view.maxScrollDepth, currentScrollDepth());
    const engaged =
        view.engaged || durationSeconds >= 12 || maxScrollDepth >= 50;
    const payload = {
        visitor_id: view.visitorId,
        browser_session_id: view.browserSessionId,
        duration_seconds: durationSeconds,
        max_scroll_depth: maxScrollDepth,
        engaged,
    };

    if (reason === 'pagehide') {
        await sendKeepalive(route('analytics.page-views.close', view.id), payload);

        return;
    }

    try {
        await window.axios.post(route('analytics.page-views.close', view.id), payload, {
            headers: {
                Accept: 'application/json',
            },
        });
    } catch {
        // Analytics failures should never interrupt navigation.
    }
}

export async function trackAnalyticsEvent({
    eventName,
    label = null,
    targetUrl = null,
    scrollDepth = null,
    properties,
}: TrackEventPayload): Promise<void> {
    const view = await resolveActivePageView();
    if (!view) {
        return;
    }

    if (
        eventName === 'outbound_click' ||
        eventName === 'search' ||
        eventName === 'follow_create' ||
        eventName === 'follow_remove'
    ) {
        view.engaged = true;
    }

    try {
        await window.axios.post(
            route('analytics.events.store'),
            {
                analytics_page_view_id: view.id,
                visitor_id: view.visitorId,
                browser_session_id: view.browserSessionId,
                route_name: view.routeName,
                path: view.path,
                event_name: eventName,
                label,
                target_url: targetUrl,
                scroll_depth: scrollDepth,
                properties,
            },
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );
    } catch {
        // Ignore telemetry failures.
    }
}

export function syncActivePageScrollDepth(): void {
    if (!activePageView) {
        return;
    }

    activePageView.maxScrollDepth = Math.max(
        activePageView.maxScrollDepth,
        currentScrollDepth(),
    );
}

export function markActivePageEngaged(): void {
    if (!activePageView) {
        return;
    }

    activePageView.engaged = true;
}

function currentScrollDepth(): number {
    if (typeof window === 'undefined') {
        return 0;
    }

    const root = document.documentElement;
    const scrollableHeight = Math.max(root.scrollHeight - window.innerHeight, 0);

    if (scrollableHeight <= 0) {
        return 100;
    }

    return clampToPercent((window.scrollY / scrollableHeight) * 100);
}

function clampToPercent(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
}

async function resolveActivePageView(): Promise<ActivePageView | null> {
    if (activePageView) {
        return activePageView;
    }

    if (pendingPageViewPromise) {
        return pendingPageViewPromise;
    }

    return null;
}

async function sendKeepalive(url: string, payload: Record<string, unknown>): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
        return;
    }

    try {
        await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
        });
    } catch {
        // Ignore background flush failures.
    }
}

function csrfToken(): string {
    const element = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');

    return element?.content ?? '';
}

function readOrCreateStorageId(
    key: string,
    storage: Storage,
): string {
    const existing = storage.getItem(key);
    if (existing) {
        return existing;
    }

    const nextId = createId();
    storage.setItem(key, nextId);

    return nextId;
}

function createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `mi-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
