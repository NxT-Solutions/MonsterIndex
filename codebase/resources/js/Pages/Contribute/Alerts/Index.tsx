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
        price_per_can_cents: number | null;
        can_count: number | null;
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
    const { localeTag, t } = useLocale();
    const dateLocale = localeTag;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {t('Community')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {t('My Price Alerts')}
                    </h2>
                </div>
            }
        >
            <Head title={t('Contributor Alerts')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <KpiCard
                            label={t('Total Alerts')}
                            value={stats.total}
                            accent="lime"
                        />
                        <KpiCard
                            label={t('Unread')}
                            value={stats.unread}
                            accent="orange"
                        />
                        <KpiCard
                            label={t('Last 24h')}
                            value={stats.last_24h}
                            accent="cyan"
                        />
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader className="flex flex-row items-center justify-between gap-3">
                            <CardTitle className="font-display text-lg text-white">
                                {t('Alerts Inbox')}
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
                                {t('Mark All Read')}
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {alerts.data.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {t('No contributor alerts yet. Follow monsters to receive price-drop signals.')}
                                </p>
                            ) : (
                                alerts.data.map((alert) => {
                                    const currentPerCan = perCanCents(alert);
                                    const displayTitle =
                                        alert.type === 'price_drop'
                                            ? `${t('Price drop')}: ${alert.monster.name}${
                                                  alert.monster.size_label
                                                      ? ` ${alert.monster.size_label}`
                                                      : ''
                                              } ${t('now')} ${formatMoney(
                                                  currentPerCan,
                                                  alert.currency,
                                              )} ${t('per can')}`
                                            : alert.title;

                                    return (
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
                                                        {displayTitle}
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
                                                    {new Date(alert.created_at).toLocaleString(
                                                        dateLocale,
                                                    )}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-sm text-white/75">
                                                {alert.body}
                                            </p>
                                            <p className="mt-2 text-xs text-white/60">
                                                {t('Store')}:{' '}
                                                {alert.monitor.site?.name ??
                                                    t('Unknown')}{' '}
                                                • {t('Per Can')}:{' '}
                                                {formatMoney(currentPerCan, alert.currency)}
                                                {alert.snapshot?.can_count &&
                                                alert.snapshot.can_count > 1
                                                    ? ` (${alert.snapshot.can_count}-${t('pack')})`
                                                    : ''}
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Link
                                                    href={route(
                                                        'monsters.show',
                                                        alert.monster.slug,
                                                    )}
                                                    className={cn(
                                                        buttonVariants({
                                                            variant: 'outline',
                                                            size: 'sm',
                                                        }),
                                                        'border-white/20 bg-transparent text-white hover:bg-white/10',
                                                    )}
                                                >
                                                    {t('Open Monster')}
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
                                                                {
                                                                    preserveScroll:
                                                                        true,
                                                                },
                                                            )
                                                        }
                                                    >
                                                        {t('Mark Read')}
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function perCanCents(alert: AlertRow): number {
    if (alert.snapshot?.price_per_can_cents !== null && alert.snapshot?.price_per_can_cents !== undefined) {
        return alert.snapshot.price_per_can_cents;
    }

    const totalCents =
        alert.snapshot?.effective_total_cents ?? alert.effective_total_cents;
    const canCount = alert.snapshot?.can_count && alert.snapshot.can_count > 0
        ? alert.snapshot.can_count
        : 1;

    return Math.round(totalCents / canCount);
}

function formatMoney(cents: number, currency: string): string {
    return `${currency} ${(cents / 100).toFixed(2)}`;
}
