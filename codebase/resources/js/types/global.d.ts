import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { AxiosInstance } from 'axios';
import { route as ziggyRoute } from 'ziggy-js';
import { PageProps as AppPageProps } from './';

declare global {
    interface BeforeInstallPromptEvent extends Event {
        readonly platforms: string[];
        prompt: () => Promise<void>;
        userChoice: Promise<{
            outcome: 'accepted' | 'dismissed';
            platform: string;
        }>;
    }

    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }

    interface Window {
        axios: AxiosInstance;
    }

    /* eslint-disable no-var */
    var route: typeof ziggyRoute;
}

declare module '@inertiajs/core' {
    interface PageProps extends InertiaPageProps, AppPageProps {}
}
