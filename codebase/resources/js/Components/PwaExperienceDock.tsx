import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import {
    enablePushNotifications,
    fetchPushDeviceState,
    getPushPermissionState,
    isPushSupported,
} from '@/lib/push';
import { isAppleMobileBrowser, isStandaloneMode } from '@/lib/pwa';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { BellRing, Download, Share2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const INSTALL_DISMISSED_KEY = 'monsterindex_install_prompt_dismissed';
const PUSH_DISMISSED_KEY = 'monsterindex_push_prompt_dismissed';

export default function PwaExperienceDock() {
    const page = usePage<PageProps>();
    const { t } = useLocale();
    const authUser = page.props.auth.user;
    const pushConfigured = Boolean(page.props.push?.vapid_configured);
    const appleMobileBrowser = isAppleMobileBrowser();
    const pushSupported = isPushSupported();
    const [installPrompt, setInstallPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [installDismissed, setInstallDismissed] = useState(() =>
        readSessionFlag(INSTALL_DISMISSED_KEY),
    );
    const [pushDismissed, setPushDismissed] = useState(() =>
        readSessionFlag(PUSH_DISMISSED_KEY),
    );
    const [isStandalone, setIsStandalone] = useState(() => isStandaloneMode());
    const [showInstallSteps, setShowInstallSteps] = useState(false);
    const [installBusy, setInstallBusy] = useState(false);
    const [pushBusy, setPushBusy] = useState(false);
    const [permission, setPermission] = useState(() => getPushPermissionState());
    const [subscriptionActive, setSubscriptionActive] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadPushState = async () => {
            if (!authUser) {
                setSubscriptionActive(false);

                return;
            }

            try {
                const state = await fetchPushDeviceState();

                if (!cancelled) {
                    setSubscriptionActive(state.currentDeviceSubscribed);
                }
            } catch {
                if (!cancelled) {
                    setSubscriptionActive(null);
                }
            }
        };

        void loadPushState();

        return () => {
            cancelled = true;
        };
    }, [authUser, page.props.push?.subscriptions_count]);

    useEffect(() => {
        if (subscriptionActive) {
            setPushDismissed(true);
            writeSessionFlag(PUSH_DISMISSED_KEY, true);
            return;
        }

        if (authUser) {
            setPushDismissed(readSessionFlag(PUSH_DISMISSED_KEY));
            return;
        }

        setPushDismissed(true);
    }, [authUser, subscriptionActive]);

    useEffect(() => {
        const syncPermissionState = () => {
            setPermission(getPushPermissionState());
        };

        syncPermissionState();
        window.addEventListener('focus', syncPermissionState);
        document.addEventListener('visibilitychange', syncPermissionState);

        return () => {
            window.removeEventListener('focus', syncPermissionState);
            document.removeEventListener('visibilitychange', syncPermissionState);
        };
    }, []);

    useEffect(() => {
        const syncStandaloneState = () => {
            const nextStandalone = isStandaloneMode();

            setIsStandalone(nextStandalone);

            if (nextStandalone) {
                setInstallPrompt(null);
                setInstallDismissed(true);
                writeSessionFlag(INSTALL_DISMISSED_KEY, true);
            }
        };

        const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
            event.preventDefault();
            setInstallPrompt(event);
            setInstallDismissed(false);
            writeSessionFlag(INSTALL_DISMISSED_KEY, false);
        };

        const handleAppInstalled = () => {
            setInstallPrompt(null);
            setIsStandalone(true);
            setInstallDismissed(true);
            writeSessionFlag(INSTALL_DISMISSED_KEY, true);
            toast.success(t('MonsterIndex is installed and ready to launch like an app.'));
        };

        const mediaQuery = window.matchMedia('(display-mode: standalone)');

        syncStandaloneState();
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncStandaloneState);
        } else {
            mediaQuery.addListener(syncStandaloneState);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);

            if (typeof mediaQuery.removeEventListener === 'function') {
                mediaQuery.removeEventListener('change', syncStandaloneState);
            } else {
                mediaQuery.removeListener(syncStandaloneState);
            }
        };
    }, [t]);

    const showInstallCard = useMemo(() => {
        return !isStandalone && !installDismissed && (installPrompt !== null || appleMobileBrowser);
    }, [appleMobileBrowser, installDismissed, installPrompt, isStandalone]);

    const showPushCard = useMemo(() => {
        return Boolean(authUser)
            && pushConfigured
            && pushSupported
            && subscriptionActive === false
            && !pushDismissed
            && (!appleMobileBrowser || isStandalone);
    }, [
        appleMobileBrowser,
        authUser,
        isStandalone,
        pushConfigured,
        pushDismissed,
        pushSupported,
        subscriptionActive,
    ]);

    const pushTitle = permission === 'granted'
        ? t('Finish enabling alerts')
        : t('Enable price alerts');
    const pushBody = permission === 'granted'
        ? t('Link this browser to your account so price-drop alerts still reach you after the app is closed.')
        : permission === 'denied'
          ? t('Notifications are blocked for MonsterIndex. Turn them back on in your browser site settings, then retry here.')
          : t('Allow notifications to get price-drop alerts in a native-style way, even when MonsterIndex is in the background.');
    const pushActionLabel = permission === 'granted'
        ? t('Finish setup')
        : permission === 'denied'
          ? t('Retry after settings')
          : t('Enable alerts');

    if (!showInstallCard && !showPushCard) {
        return null;
    }

    const handleInstall = async () => {
        if (!installPrompt) {
            setShowInstallSteps((state) => !state);
            return;
        }

        setInstallBusy(true);

        try {
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;

            setInstallPrompt(null);

            if (choice.outcome === 'dismissed') {
                setInstallDismissed(true);
                writeSessionFlag(INSTALL_DISMISSED_KEY, true);
                toast.message(
                    t('Install was dismissed. You can still add MonsterIndex from your browser menu later.'),
                );
            }
        } finally {
            setInstallBusy(false);
        }
    };

    const handleEnablePush = async () => {
        setPushBusy(true);

        try {
            const result = await enablePushNotifications();

            setPermission(result.permission);

            if (result.ok) {
                setSubscriptionActive(true);
                setPushDismissed(true);
                writeSessionFlag(PUSH_DISMISSED_KEY, true);
                toast.success(t('Price alerts are enabled on this device.'));
                router.reload({
                    only: ['push'],
                });

                return;
            }

            if (result.permission === 'denied') {
                toast.error(
                    t('Notifications are blocked. Re-enable them in your browser site settings, then try again.'),
                );

                return;
            }

            toast.error(t('Could not enable push notifications.'));
        } catch {
            toast.error(t('Push setup failed. Check browser permissions and VAPID config.'));
        } finally {
            setPushBusy(false);
        }
    };

    return (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col gap-3 md:inset-x-auto md:right-6 md:w-[24rem]">
            {showInstallCard && (
                <Card className="pointer-events-auto overflow-hidden border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-surface)]/95 text-white shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
                    <div className="h-1 w-full bg-[linear-gradient(90deg,#8ceb00_0%,#d3ff89_100%)]" />
                    <CardHeader className="space-y-3 pb-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-surface-2)] text-[color:var(--landing-accent)]">
                                    {appleMobileBrowser && installPrompt === null ? (
                                        <Share2 className="h-5 w-5" />
                                    ) : (
                                        <Download className="h-5 w-5" />
                                    )}
                                </span>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--landing-accent)]">
                                        {t('Native mode')}
                                    </p>
                                    <CardTitle className="text-white">
                                        {t('Install MonsterIndex')}
                                    </CardTitle>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setInstallDismissed(true);
                                    writeSessionFlag(INSTALL_DISMISSED_KEY, true);
                                }}
                                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                                aria-label={t('Dismiss install prompt')}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-sm leading-6 text-white/75">
                            {appleMobileBrowser && installPrompt === null
                                ? t('Add MonsterIndex to your home screen for a full-screen app shell and, on iPhone or iPad, browser push permissions.')
                                : t('Keep MonsterIndex one tap away with a full-screen install that feels closer to a native app.')}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                        {appleMobileBrowser && installPrompt === null && showInstallSteps && (
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-white/70">
                                <p className="font-semibold text-white/90">
                                    {t('Install steps')}
                                </p>
                                <ol className="mt-2 space-y-1.5">
                                    <li>{t('1. Open MonsterIndex in Safari.')}</li>
                                    <li>{t('2. Tap the Share button.')}</li>
                                    <li>{t('3. Choose “Add to Home Screen”.')}</li>
                                    <li>{t('4. Launch the installed app to unlock the most native-like experience.')}</li>
                                </ol>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                loading={installBusy}
                                onClick={handleInstall}
                                className="bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95"
                            >
                                {installPrompt
                                    ? t('Install app')
                                    : showInstallSteps
                                      ? t('Hide steps')
                                      : t('How to install')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    setInstallDismissed(true);
                                    writeSessionFlag(INSTALL_DISMISSED_KEY, true);
                                }}
                                className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                            >
                                {t('Maybe later')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {showPushCard && (
                <Card className={cn(
                    'pointer-events-auto overflow-hidden border-white/10 bg-[color:var(--landing-surface)]/95 text-white shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl',
                    permission === 'denied' && 'border-amber-400/40',
                )}>
                    <div className="h-1 w-full bg-[linear-gradient(90deg,#4dd6ff_0%,#8ceb00_100%)]" />
                    <CardHeader className="space-y-3 pb-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-200">
                                    <BellRing className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                                        {t('Alerts')}
                                    </p>
                                    <CardTitle className="text-white">
                                        {pushTitle}
                                    </CardTitle>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setPushDismissed(true);
                                    writeSessionFlag(PUSH_DISMISSED_KEY, true);
                                }}
                                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                                aria-label={t('Dismiss alerts prompt')}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-sm leading-6 text-white/75">
                            {pushBody}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                            {t('Permission')}: {permission}
                        </p>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 pt-0">
                        <Button
                            type="button"
                            size="sm"
                            loading={pushBusy}
                            onClick={handleEnablePush}
                            className="bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95"
                        >
                            {pushActionLabel}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                                setPushDismissed(true);
                                writeSessionFlag(PUSH_DISMISSED_KEY, true);
                            }}
                            className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        >
                            {t('Later')}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function readSessionFlag(key: string): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.sessionStorage.getItem(key) === '1';
    } catch {
        return false;
    }
}

function writeSessionFlag(key: string, value: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        if (value) {
            window.sessionStorage.setItem(key, '1');
            return;
        }

        window.sessionStorage.removeItem(key);
    } catch {
        // Ignore storage access failures for private browsing modes.
    }
}
