import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { useMemo } from 'react';

type AlertRow = {
    id: number;
    type: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
    monster: {
        name: string;
        slug: string;
    };
    monitor: {
        id: number;
        site: {
            name: string;
        };
    };
};

export default function AlertsIndex({
    alerts,
}: {
    alerts: {
        data: AlertRow[];
    };
}) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    const stats = useMemo(() => {
        const unread = alerts.data.filter((alert) => !alert.read_at).length;
        const today = new Date();
        const last24h = alerts.data.filter((alert) => {
            const created = new Date(alert.created_at).getTime();
            return created >= today.getTime() - 24 * 60 * 60 * 1000;
        }).length;

        return {
            total: alerts.data.length,
            unread,
            read: alerts.data.length - unread,
            last24h,
        };
    }, [alerts.data]);

    const byType = useMemo(() => {
        const grouped = new Map<string, number>();

        alerts.data.forEach((alert) => {
            grouped.set(alert.type, (grouped.get(alert.type) ?? 0) + 1);
        });

        return Array.from(grouped.entries())
            .map(([type, value]) => ({ id: type, label: type, value }))
            .sort((left, right) => right.value - left.value);
    }, [alerts.data]);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Signals', 'Signalen')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Alerts', 'Meldingen')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Admin Alerts', 'Admin Meldingen')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label={x('Loaded Alerts', 'Geladen Meldingen')}
                            value={stats.total}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Unread', 'Ongelezen')}
                            value={stats.unread}
                            accent="orange"
                        />
                        <KpiCard
                            label={x('Read', 'Gelezen')}
                            value={stats.read}
                            accent="emerald"
                        />
                        <KpiCard
                            label={x('Last 24h', 'Laatste 24u')}
                            value={stats.last24h}
                            accent="cyan"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1fr_2fr]">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Alert Types', 'Meldingstypes')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarMeter
                                    rows={byType}
                                    emptyLabel={x(
                                        'No alert distribution yet.',
                                        'Nog geen meldingsverdeling.',
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('In-app Alerts', 'In-app Meldingen')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {alerts.data.length === 0 && (
                                    <p className="text-sm text-white/65">
                                        {x('No alerts yet.', 'Nog geen meldingen.')}
                                    </p>
                                )}

                                {alerts.data.map((alert) => (
                                    <article
                                        key={alert.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <h3 className="font-medium text-white">
                                                {alert.title}
                                            </h3>
                                            <span className="text-xs text-white/55">
                                                {new Date(
                                                    alert.created_at,
                                                ).toLocaleString(dateLocale)}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-white/75">
                                            {alert.body}
                                        </p>
                                        <p className="mt-2 text-xs text-white/60">
                                            {x('Monster:', 'Monster:')}{' '}
                                            {alert.monster.name} •{' '}
                                            {x('Store:', 'Winkel:')}{' '}
                                            {alert.monitor.site.name} •{' '}
                                            {x('Type:', 'Type:')}{' '}
                                            {alert.type}
                                        </p>
                                        {!alert.read_at && (
                                            <button
                                                type="button"
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'outline',
                                                        size: 'sm',
                                                    }),
                                                    'mt-3 border-white/20 bg-transparent text-white hover:bg-white/10',
                                                )}
                                                onClick={() =>
                                                    router.post(
                                                        route(
                                                            'admin.alerts.mark-read',
                                                            alert.id,
                                                        ),
                                                    )
                                                }
                                            >
                                                {x(
                                                    'Mark Read',
                                                    'Markeer Als Gelezen',
                                                )}
                                            </button>
                                        )}
                                    </article>
                                ))}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
