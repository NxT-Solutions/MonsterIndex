import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';

type AlertRow = {
    id: number;
    type: string;
    currency: string;
    effective_total_cents: number;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
    monster: {
        id: number;
        name: string;
        slug: string;
        size_label: string | null;
    };
    monitor: {
        id: number;
        site: {
            id: number;
            name: string;
            domain: string;
        } | null;
    };
    snapshot: {
        id: number;
        checked_at: string | null;
        effective_total_cents: number | null;
        currency: string;
    } | null;
};

export default function ContributorAlertsIndex({
    alerts,
    stats,
}: {
    alerts: {
        data: AlertRow[];
    };
    stats: {
        total: number;
        unread: number;
        last_24h: number;
    };
}) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Community', 'Community')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('My Price Alerts', 'Mijn Prijsmeldingen')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Contributor Alerts', 'Bijdragersmeldingen')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <KpiCard
                            label={x('Total Alerts', 'Totale Meldingen')}
                            value={stats.total}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Unread', 'Ongelezen')}
                            value={stats.unread}
                            accent="orange"
                        />
                        <KpiCard
                            label={x('Last 24h', 'Laatste 24u')}
                            value={stats.last_24h}
                            accent="cyan"
                        />
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader className="flex flex-row items-center justify-between gap-3">
                            <CardTitle className="font-display text-lg text-white">
                                {x('Alerts Inbox', 'Meldingen Inbox')}
                            </CardTitle>
                            <button
                                type="button"
                                className={cn(
                                    buttonVariants({
                                        variant: 'outline',
                                        size: 'sm',
                                    }),
                                    'border-white/20 bg-transparent text-white hover:bg-white/10',
                                )}
                                onClick={() =>
                                    router.post(
                                        route('contribute.alerts.mark-all-read'),
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                {x('Mark All Read', 'Markeer Alles Gelezen')}
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {alerts.data.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {x(
                                        'No contributor alerts yet. Follow monsters to receive price-drop signals.',
                                        'Nog geen bijdragersmeldingen. Volg monsters om prijsdalingssignalen te ontvangen.',
                                    )}
                                </p>
                            ) : (
                                alerts.data.map((alert) => (
                                    <article
                                        key={alert.id}
                                        className={cn(
                                            'rounded-xl border p-4',
                                            alert.read_at
                                                ? 'border-white/10 bg-[color:var(--landing-surface-2)]'
                                                : 'border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-surface-2)]/95',
                                        )}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-medium text-white">
                                                    {alert.title}
                                                </h3>
                                                <p className="text-xs text-white/60">
                                                    {alert.monster.name}
                                                    {alert.monster.size_label
                                                        ? ` (${alert.monster.size_label})`
                                                        : ''}{' '}
                                                    • {alert.currency}
                                                </p>
                                            </div>
                                            <span className="text-xs text-white/55">
                                                {new Date(alert.created_at).toLocaleString(dateLocale)}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm text-white/75">{alert.body}</p>
                                        <p className="mt-2 text-xs text-white/60">
                                            {x('Store', 'Winkel')}: {alert.monitor.site?.name ?? x('Unknown', 'Onbekend')}{' '}
                                            • {x('Total', 'Totaal')}: {alert.currency}{' '}
                                            {(alert.effective_total_cents / 100).toFixed(2)}
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Link
                                                href={route('monsters.show', alert.monster.slug)}
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'outline',
                                                        size: 'sm',
                                                    }),
                                                    'border-white/20 bg-transparent text-white hover:bg-white/10',
                                                )}
                                            >
                                                {x('Open Monster', 'Open Monster')}
                                            </Link>
                                            {!alert.read_at && (
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        buttonVariants({
                                                            variant: 'outline',
                                                            size: 'sm',
                                                        }),
                                                        'border-white/20 bg-transparent text-white hover:bg-white/10',
                                                    )}
                                                    onClick={() =>
                                                        router.post(
                                                            route(
                                                                'contribute.alerts.mark-read',
                                                                alert.id,
                                                            ),
                                                            {},
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                >
                                                    {x(
                                                        'Mark Read',
                                                        'Markeer Gelezen',
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

