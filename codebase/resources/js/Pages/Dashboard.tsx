import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import {
    disablePushNotifications,
    enablePushNotifications,
    isPushSupported,
} from '@/lib/push';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function Dashboard({ auth, push }: PageProps) {
    const { t } = useLocale();
    const [pushBusy, setPushBusy] = useState(false);
    const [pushFeedback, setPushFeedback] = useState<string | null>(null);
    const [permission, setPermission] = useState<
        NotificationPermission | 'unsupported'
    >('unsupported');
    const pushSupported = isPushSupported();
    const pushConfigured = Boolean(push?.vapid_configured);
    const pushEnabled = Boolean(push?.has_active_subscription);
    const [subscriptionActive, setSubscriptionActive] = useState(pushEnabled);

    useEffect(() => {
        if (!pushSupported) {
            setPermission('unsupported');

            return;
        }

        setPermission(Notification.permission);
    }, [pushSupported]);

    useEffect(() => {
        setSubscriptionActive(pushEnabled);
    }, [pushEnabled]);

    const refreshPushState = () => {
        router.reload({
            only: ['push'],
        });
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
                                    {t('Enable web push to receive alert notifications in your browser/PWA.')}
                                </p>
                                <p className="text-xs text-white/60">
                                    {t('Browser support')}: {pushSupported ? t('Yes') : t('No')}
                                    {' • '}
                                    {t('Permission')}: {permission}
                                    {' • '}
                                    {t('Configured')}: {pushConfigured ? t('Yes') : t('No')}
                                    {' • '}
                                    {t('Subscribed')}: {subscriptionActive ? t('Yes') : t('No')}
                                </p>
                                {pushFeedback && (
                                    <p className="text-xs text-[color:var(--landing-accent)]">
                                        {pushFeedback}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {!subscriptionActive && (
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
                                                        setSubscriptionActive(true);
                                                        setPushFeedback(
                                                            t('Push notifications enabled.'),
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
                                                    setPushBusy(false);
                                                    refreshPushState();
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
                                                    setSubscriptionActive(false);
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
                                                    setPushBusy(false);
                                                    refreshPushState();
                                                }
                                            }}
                                        >
                                            {t('Disable Push')}
                                        </button>
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
