import {
    beginAnalyticsPageView,
    flushActiveAnalyticsPageView,
    markActivePageEngaged,
    syncActivePageScrollDepth,
    trackAnalyticsEvent,
} from '@/lib/analytics';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

export default function AnalyticsTracker() {
    const page = usePage<PageProps>();
    const lastTrackedUrlRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const syncPageView = async () => {
            await flushActiveAnalyticsPageView('navigate');

            if (cancelled) {
                return;
            }

            const currentUrl = window.location.href;
            const currentPath = window.location.pathname;
            const referrerUrl =
                lastTrackedUrlRef.current ?? normalizeReferrer(document.referrer);

            await beginAnalyticsPageView({
                routeName: route().current() ?? null,
                pageComponent: page.component,
                path: currentPath,
                url: currentUrl,
                title: document.title,
                referrerUrl,
                locale: page.props.locale.current,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
            });

            if (!cancelled) {
                lastTrackedUrlRef.current = currentUrl;
                syncActivePageScrollDepth();
            }
        };

        void syncPageView();

        return () => {
            cancelled = true;
        };
    }, [page.component, page.props.locale.current, page.url]);

    useEffect(() => {
        const handleScroll = () => {
            syncActivePageScrollDepth();
        };

        const handleInteraction = () => {
            markActivePageEngaged();
        };

        const handleVisibilityChange = () => {
            syncActivePageScrollDepth();

            if (document.visibilityState === 'hidden') {
                void flushActiveAnalyticsPageView('pagehide');
            }
        };

        const handlePageHide = () => {
            syncActivePageScrollDepth();
            void flushActiveAnalyticsPageView('pagehide');
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const anchor = target.closest('a[href]');
            if (!(anchor instanceof HTMLAnchorElement)) {
                return;
            }

            const href = anchor.href;
            if (!href) {
                return;
            }

            const targetUrl = new URL(href, window.location.href);
            if (targetUrl.origin === window.location.origin) {
                return;
            }

            markActivePageEngaged();

            void trackAnalyticsEvent({
                eventName: 'outbound_click',
                label: anchor.textContent?.trim().slice(0, 120) ?? null,
                targetUrl: targetUrl.toString(),
                properties: {
                    target: anchor.target || null,
                },
            });
        };

        syncActivePageScrollDepth();

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
        window.addEventListener('pagehide', handlePageHide);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('pointerdown', handleInteraction, true);
        document.addEventListener('keydown', handleInteraction, true);
        document.addEventListener('click', handleClick, true);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            window.removeEventListener('pagehide', handlePageHide);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('pointerdown', handleInteraction, true);
            document.removeEventListener('keydown', handleInteraction, true);
            document.removeEventListener('click', handleClick, true);
        };
    }, []);

    useEffect(() => {
        return () => {
            void flushActiveAnalyticsPageView('unmount');
        };
    }, []);

    return null;
}

function normalizeReferrer(value: string): string | null {
    const trimmed = value.trim();

    return trimmed !== '' ? trimmed : null;
}
