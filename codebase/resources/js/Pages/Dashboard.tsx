import KpiCard from '@/Components/admin/KpiCard';
import { Badge } from '@/Components/ui/badge';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import {
    deletePushSubscriptionByEndpoint,
    disablePushNotifications,
    enablePushNotifications,
    fetchPushDeviceState,
    getPushPermissionState,
    isPushSupported,
    type PushDevice,
} from '@/lib/push';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function Dashboard({ auth, push }: PageProps) {
    const { t, localeTag } = useLocale();
    const [pushBusy, setPushBusy] = useState(false);
    const [pushFeedback, setPushFeedback] = useState<string | null>(null);
    const [permission, setPermission] = useState<
        NotificationPermission | 'unsupported'
    >('unsupported');
    const [subscriptionActive, setSubscriptionActive] = useState<boolean | null>(null);
    const [subscriptions, setSubscriptions] = useState<PushDevice[]>([]);
    const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
    const [devicesLoading, setDevicesLoading] = useState(true);
    const [deviceActionEndpoint, setDeviceActionEndpoint] = useState<string | null>(null);
    const pushSupported = isPushSupported();
    const pushConfigured = Boolean(push?.vapid_configured);
    const connectedDeviceCount = devicesLoading && subscriptions.length === 0
        ? Number(push?.subscriptions_count ?? 0)
        : subscriptions.length;

    useEffect(() => {
        if (!pushSupported) {
            setPermission('unsupported');

            return;
        }

        setPermission(getPushPermissionState());
    }, [pushSupported]);

    useEffect(() => {
        let cancelled = false;

        const loadPushState = async () => {
            setDevicesLoading(true);

            try {
                const state = await fetchPushDeviceState();

                if (cancelled) {
                    return;
                }

                setSubscriptions(state.subscriptions);
                setCurrentEndpoint(state.currentEndpoint);
                setSubscriptionActive(state.currentDeviceSubscribed);
            } catch {
                // Keep the last known state if the device list cannot be refreshed.
            } finally {
                if (!cancelled) {
                    setDevicesLoading(false);
                }
            }
        };

        void loadPushState();

        return () => {
            cancelled = true;
        };
    }, [push?.subscriptions_count]);

    const refreshSharedPushState = () => {
        router.reload({
            only: ['push'],
        });
    };

    const syncPushState = async () => {
        const state = await fetchPushDeviceState();

        setSubscriptions(state.subscriptions);
        setCurrentEndpoint(state.currentEndpoint);
        setSubscriptionActive(state.currentDeviceSubscribed);
    };

    const handleRemoveDevice = async (endpoint: string) => {
        setDeviceActionEndpoint(endpoint);
        setPushFeedback(null);

        try {
            if (currentEndpoint !== null && endpoint === currentEndpoint) {
                const result = await disablePushNotifications();

                setPermission(result.permission);
                setPushFeedback(
                    result.browserPermissionRevoked
                        ? t('Push notifications disabled.')
                        : t('Push notifications disabled. Browser notification permission is still granted; change it in your browser site settings if you want to be asked again.'),
                );
            } else {
                await deletePushSubscriptionByEndpoint(endpoint);
                setPushFeedback(t('Push alerts disabled for the selected device.'));
            }

            await syncPushState();
        } catch {
            setPushFeedback(t('Could not remove that device.'));
        } finally {
            setDeviceActionEndpoint(null);
            refreshSharedPushState();
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {t('Workspace')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {t('Dashboard')}
                    </h2>
                </div>
            }
        >
            <Head title={t('Dashboard')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            label={t('Signed-in User')}
                            value={auth.user?.name ?? '-'}
                            hint={auth.user?.email ?? undefined}
                            accent="lime"
                        />
                        <KpiCard
                            label={t('Role')}
                            value={
                                auth.user?.can.admin_access
                                    ? t('Admin')
                                    : t('Contributor')
                            }
                            hint={t('Access level in this workspace')}
                            accent="cyan"
                        />
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Explore Deals')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-white/75">
                                <p>
                                    {t('Use the public board to browse current best Monster offers.')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href={route('home')}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'secondary',
                                                size: 'sm',
                                            }),
                                            'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                        )}
                                    >
                                        {t('Open Public Board')}
                                    </Link>

                                    {auth.user?.can.monitor_submit && (
                                        <Link
                                            href={route('contribute.monitors.index')}
                                            className={cn(
                                                buttonVariants({
                                                    variant: 'secondary',
                                                    size: 'sm',
                                                }),
                                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                            )}
                                        >
                                            {t('Manage My Monitors')}
                                        </Link>
                                    )}

                                    {auth.user?.can.monster_suggestion_submit && (
                                        <Link
                                            href={route('contribute.suggestions.index')}
                                            className={cn(
                                                buttonVariants({
                                                    variant: 'secondary',
                                                    size: 'sm',
                                                }),
                                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                            )}
                                        >
                                            {t('Suggest Monster')}
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {auth.user?.can.admin_access && (
                            <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                <CardHeader>
                                    <CardTitle className="font-display text-lg text-white">
                                        {t('Admin Controls')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-white/75">
                                    <p>
                                        {t('Manage monsters, monitors, and alerts from the operations dashboard.')}
                                    </p>
                                    <Link
                                        href={route('admin.dashboard')}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'default',
                                                size: 'sm',
                                            }),
                                            'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                        )}
                                    >
                                        {t('Open Admin Console')}
                                    </Link>
                                </CardContent>
                            </Card>
                        )}
                    </section>

                    <section>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Notification Settings')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-white/75">
                                <p>
                                    {t('Enable web push to receive alert notifications in this browser/PWA.')}
                                </p>
                                <p className="text-xs text-white/60">
                                    {t('Browser support')}: {pushSupported ? t('Yes') : t('No')}
                                    {' • '}
                                    {t('Permission')}: {permission}
                                    {' • '}
                                    {t('Configured')}: {pushConfigured ? t('Yes') : t('No')}
                                    {' • '}
                                    {t('This device')}: {subscriptionActive === null
                                        ? t('Checking...')
                                        : (subscriptionActive ? t('Yes') : t('No'))}
                                    {' • '}
                                    {t('Connected devices')}: {connectedDeviceCount}
                                </p>
                                {pushFeedback && (
                                    <p className="text-xs text-[color:var(--landing-accent)]">
                                        {pushFeedback}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {subscriptionActive === false && (
                                        <button
                                            type="button"
                                            className={cn(
                                                buttonVariants({
                                                    variant: 'default',
                                                    size: 'sm',
                                                }),
                                                'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                            )}
                                            disabled={
                                                pushBusy ||
                                                !pushSupported ||
                                                !pushConfigured
                                            }
                                            onClick={async () => {
                                                setPushBusy(true);
                                                setPushFeedback(null);
                                                try {
                                                    const result = await enablePushNotifications();
                                                    setPermission(result.permission);
                                                    if (result.ok) {
                                                        setPushFeedback(
                                                            t('Push notifications enabled on this device.'),
                                                        );
                                                    } else {
                                                        setPushFeedback(
                                                            t('Could not enable push notifications.'),
                                                        );
                                                    }
                                                } catch {
                                                    setPushFeedback(
                                                        t('Push setup failed. Check browser permissions and VAPID config.'),
                                                    );
                                                } finally {
                                                    await syncPushState().catch(() => undefined);
                                                    setPushBusy(false);
                                                    refreshSharedPushState();
                                                }
                                            }}
                                        >
                                            {pushBusy
                                                ? t('Processing...')
                                                : t('Enable Push')}
                                        </button>
                                    )}
                                    {subscriptionActive && (
                                        <button
                                            type="button"
                                            className={cn(
                                                buttonVariants({
                                                    variant: 'secondary',
                                                    size: 'sm',
                                                }),
                                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                            )}
                                            disabled={pushBusy || !pushSupported}
                                            onClick={async () => {
                                                setPushBusy(true);
                                                setPushFeedback(null);
                                                try {
                                                    const result = await disablePushNotifications();
                                                    setPermission(result.permission);
                                                    if (result.browserPermissionRevoked) {
                                                        setPushFeedback(
                                                            t('Push notifications disabled.'),
                                                        );
                                                    } else {
                                                        setPushFeedback(
                                                            t('Push notifications disabled. Browser notification permission is still granted; change it in your browser site settings if you want to be asked again.'),
                                                        );
                                                    }
                                                } catch {
                                                    setPushFeedback(
                                                        t('Could not disable push notifications.'),
                                                    );
                                                } finally {
                                                    await syncPushState().catch(() => undefined);
                                                    setPushBusy(false);
                                                    refreshSharedPushState();
                                                }
                                            }}
                                        >
                                            {t('Disable Push')}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                                            {t('Connected devices')}
                                        </p>
                                        <p className="text-xs text-white/65">
                                            {t('Manage which browsers and devices can receive push alerts for your account.')}
                                        </p>
                                    </div>

                                    {devicesLoading && subscriptions.length === 0 ? (
                                        <p className="text-xs text-white/60">
                                            {t('Loading devices...')}
                                        </p>
                                    ) : subscriptions.length === 0 ? (
                                        <p className="text-xs text-white/60">
                                            {t('No devices have push alerts enabled yet.')}
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {subscriptions.map((subscription) => {
                                                const isCurrentDevice = currentEndpoint !== null
                                                    && subscription.endpoint === currentEndpoint;
                                                const removing = deviceActionEndpoint === subscription.endpoint;

                                                return (
                                                    <div
                                                        key={subscription.id}
                                                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:flex-row md:items-center md:justify-between"
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-medium text-white">
                                                                    {describePushDevice(subscription.user_agent)}
                                                                </p>
                                                                {isCurrentDevice && (
                                                                    <Badge
                                                                        variant="accent"
                                                                        className="border-0 bg-[color:var(--landing-accent)] text-[#0b1201]"
                                                                    >
                                                                        {t('This device')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-white/60">
                                                                {t('Saved')}: {formatPushDeviceDate(subscription.created_at, localeTag, t)}
                                                                {' • '}
                                                                {t('Subscription')}: {shortPushEndpoint(subscription.endpoint)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={cn(
                                                                buttonVariants({
                                                                    variant: isCurrentDevice
                                                                        ? 'secondary'
                                                                        : 'ghost',
                                                                    size: 'sm',
                                                                }),
                                                                isCurrentDevice
                                                                    ? 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                                                                    : 'text-white/70 hover:bg-white/5 hover:text-white',
                                                            )}
                                                            disabled={pushBusy || deviceActionEndpoint !== null}
                                                            onClick={() => {
                                                                void handleRemoveDevice(subscription.endpoint);
                                                            }}
                                                        >
                                                            {removing
                                                                ? t('Removing...')
                                                                : (isCurrentDevice ? t('Disable Push') : t('Remove device'))}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function describePushDevice(userAgent: string | null): string {
    if (!userAgent) {
        return 'Browser device';
    }

    const normalized = userAgent.toLowerCase();
    const browser = normalized.includes('edg/')
        ? 'Edge'
        : (normalized.includes('opr/') || normalized.includes('opera'))
          ? 'Opera'
          : (normalized.includes('firefox/') || normalized.includes('fxios/'))
            ? 'Firefox'
            : (normalized.includes('crios/') || normalized.includes('chrome/'))
              ? 'Chrome'
              : normalized.includes('safari/')
                ? 'Safari'
                : 'Browser';
    const device = normalized.includes('iphone')
        ? 'iPhone'
        : normalized.includes('ipad')
          ? 'iPad'
          : normalized.includes('android')
            ? 'Android'
            : normalized.includes('windows')
              ? 'Windows'
              : (normalized.includes('macintosh') || normalized.includes('mac os x'))
                ? 'Mac'
                : normalized.includes('linux')
                  ? 'Linux'
                  : 'device';

    return `${browser} on ${device}`;
}

function formatPushDeviceDate(
    isoTimestamp: string | null,
    localeTag: string,
    t: (key: string) => string,
): string {
    if (!isoTimestamp) {
        return t('Unknown');
    }

    const date = new Date(isoTimestamp);

    if (Number.isNaN(date.getTime())) {
        return t('Unknown');
    }

    return new Intl.DateTimeFormat(localeTag, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function shortPushEndpoint(endpoint: string): string {
    if (endpoint.length <= 14) {
        return endpoint;
    }

    return `...${endpoint.slice(-14)}`;
}
