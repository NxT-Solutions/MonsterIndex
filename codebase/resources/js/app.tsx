import '../css/app.css';
import './bootstrap';

import { AppDialogProvider } from '@/Components/providers/AppDialogProvider';
import PwaExperienceDock from '@/Components/PwaExperienceDock';
import AppToaster from '@/Components/ui/toaster';
import { LocaleProvider } from '@/lib/locale';
import { registerServiceWorker } from '@/lib/push';
import { ThemeProvider } from '@/lib/theme';
import type { PageProps } from '@/types';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

if (typeof window !== 'undefined') {
    registerServiceWorker().catch(() => undefined);
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
                                    <PwaExperienceDock />
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
