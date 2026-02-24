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
    const { x } = useLocale();
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
                        {x('Workspace', 'Werkruimte')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Dashboard', 'Dashboard')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Dashboard', 'Dashboard')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            label={x('Signed-in User', 'Aangemelde Gebruiker')}
                            value={auth.user?.name ?? '-'}
                            hint={auth.user?.email ?? undefined}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Role', 'Rol')}
                            value={
                                auth.user?.can.admin_access
                                    ? x('Admin', 'Admin')
                                    : x('Contributor', 'Bijdrager')
                            }
                            hint={x(
                                'Access level in this workspace',
                                'Toegangsniveau in deze werkruimte',
                            )}
                            accent="cyan"
                        />
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Explore Deals', 'Verken Deals')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-white/75">
                                <p>
                                    {x(
                                        'Use the public board to browse current best Monster offers.',
                                        'Gebruik het publieke bord om huidige beste Monster-aanbiedingen te bekijken.',
                                    )}
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
                                        {x('Open Public Board', 'Open Publiek Bord')}
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
                                            {x('Manage My Monitors', 'Beheer Mijn Monitoren')}
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
                                            {x('Suggest Monster', 'Stel Monster Voor')}
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {auth.user?.can.admin_access && (
                            <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                <CardHeader>
                                    <CardTitle className="font-display text-lg text-white">
                                        {x('Admin Controls', 'Adminbesturing')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-white/75">
                                    <p>
                                        {x(
                                            'Manage monsters, monitors, and alerts from the operations dashboard.',
                                            'Beheer monsters, monitoren en meldingen vanuit het operationele dashboard.',
                                        )}
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
                                        {x('Open Admin Console', 'Open Admin Console')}
                                    </Link>
                                </CardContent>
                            </Card>
                        )}
                    </section>

                    <section>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Notification Settings', 'Meldingsinstellingen')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-white/75">
                                <p>
                                    {x(
                                        'Enable web push to receive alert notifications in your browser/PWA.',
                                        'Schakel web push in om alertmeldingen in je browser/PWA te ontvangen.',
                                    )}
                                </p>
                                <p className="text-xs text-white/60">
                                    {x('Browser support', 'Browserondersteuning')}: {pushSupported ? x('Yes', 'Ja') : x('No', 'Nee')}
                                    {' • '}
                                    {x('Permission', 'Permissie')}: {permission}
                                    {' • '}
                                    {x('Configured', 'Geconfigureerd')}: {pushConfigured ? x('Yes', 'Ja') : x('No', 'Nee')}
                                    {' • '}
                                    {x('Subscribed', 'Geabonneerd')}: {subscriptionActive ? x('Yes', 'Ja') : x('No', 'Nee')}
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
                                                            x(
                                                                'Push notifications enabled.',
                                                                'Pushmeldingen ingeschakeld.',
                                                            ),
                                                        );
                                                    } else {
                                                        setPushFeedback(
                                                            x(
                                                                'Could not enable push notifications.',
                                                                'Kon pushmeldingen niet inschakelen.',
                                                            ),
                                                        );
                                                    }
                                                } catch {
                                                    setPushFeedback(
                                                        x(
                                                            'Push setup failed. Check browser permissions and VAPID config.',
                                                            'Pushinstelling mislukt. Controleer browserrechten en VAPID-configuratie.',
                                                        ),
                                                    );
                                                } finally {
                                                    setPushBusy(false);
                                                    refreshPushState();
                                                }
                                            }}
                                        >
                                            {pushBusy
                                                ? x('Processing...', 'Verwerken...')
                                                : x('Enable Push', 'Push Inschakelen')}
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
                                                            x(
                                                                'Push notifications disabled.',
                                                                'Pushmeldingen uitgeschakeld.',
                                                            ),
                                                        );
                                                    } else {
                                                        setPushFeedback(
                                                            x(
                                                                'Push notifications disabled. Browser notification permission is still granted; change it in your browser site settings if you want to be asked again.',
                                                                'Pushmeldingen uitgeschakeld. Browsermeldingsrechten blijven toegestaan; wijzig dit in je browser-site-instellingen als je opnieuw gevraagd wil worden.',
                                                            ),
                                                        );
                                                    }
                                                } catch {
                                                    setPushFeedback(
                                                        x(
                                                            'Could not disable push notifications.',
                                                            'Kon pushmeldingen niet uitschakelen.',
                                                        ),
                                                    );
                                                } finally {
                                                    setPushBusy(false);
                                                    refreshPushState();
                                                }
                                            }}
                                        >
                                            {x('Disable Push', 'Push Uitschakelen')}
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
