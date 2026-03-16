import '../css/app.css';
import './bootstrap';

import { AppDialogProvider } from '@/Components/providers/AppDialogProvider';
import AppToaster from '@/Components/ui/toaster';
import { LocaleProvider } from '@/lib/locale';
import { registerServiceWorker } from '@/lib/push';
import { ThemeProvider } from '@/lib/theme';
import type { PageProps } from '@/types';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { Suspense, lazy, startTransition, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
const PwaExperienceDock = lazy(() => import('@/Components/PwaExperienceDock'));

if (typeof window !== 'undefined') {
    const runRegistration = () => {
        registerServiceWorker().catch(() => undefined);
    };

    if (document.readyState === 'complete') {
        runRegistration();
    } else {
        window.addEventListener('load', runRegistration, { once: true });
    }
}

function DeferredPwaExperience() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const idleWindow = window as Window &
            typeof globalThis & {
                requestIdleCallback?: (
                    callback: IdleRequestCallback,
                    options?: IdleRequestOptions,
                ) => number;
                cancelIdleCallback?: (handle: number) => void;
            };

        const scheduleEnable = () => {
            if (typeof idleWindow.requestIdleCallback === 'function') {
                const idleCallbackId = idleWindow.requestIdleCallback(() => {
                    startTransition(() => setEnabled(true));
                }, { timeout: 1500 });

                return () => {
                    idleWindow.cancelIdleCallback?.(idleCallbackId);
                };
            }

            const timeoutId = globalThis.setTimeout(() => {
                startTransition(() => setEnabled(true));
            }, 350);

            return () => {
                globalThis.clearTimeout(timeoutId);
            };
        };

        if (document.readyState === 'complete') {
            return scheduleEnable();
        }

        let cancelScheduledEnable: (() => void) | null = null;
        const handleLoad = () => {
            cancelScheduledEnable = scheduleEnable();
        };

        window.addEventListener('load', handleLoad, { once: true });

        return () => {
            window.removeEventListener('load', handleLoad);
            cancelScheduledEnable?.();
        };
    }, []);

    if (!enabled) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            <PwaExperienceDock />
        </Suspense>
    );
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        const initialPage = props.initialPage as {
            props: PageProps;
        };

        root.render(
            <ThemeProvider>
                <LocaleProvider
                    initialLocale={initialPage.props.locale.current}
                    fallbackLocale={initialPage.props.locale.fallback}
                    cookieName={initialPage.props.locale.cookie_name}
                    supportedLocales={initialPage.props.locale.supported}
                >
                    <AppDialogProvider>
                        <App {...props}>
                            {({ Component, props: pageProps, key }) => (
                                <>
                                    <Component key={key} {...pageProps} />
                                    <DeferredPwaExperience />
                                    <AppToaster />
                                </>
                            )}
                        </App>
                    </AppDialogProvider>
                </LocaleProvider>
            </ThemeProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});
