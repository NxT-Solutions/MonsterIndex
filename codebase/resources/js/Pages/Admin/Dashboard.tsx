import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import TrendLineChart from '@/Components/admin/TrendLineChart';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';

type DashboardStats = {
    monsters_total: number;
    sites_total: number;
    monitors_total: number;
    monitors_active: number;
    monitors_with_selector: number;
    selector_coverage_percent: number;
    snapshots_24h: number;
    snapshots_failed_24h: number;
    snapshot_success_percent_24h: number;
    alerts_unread: number;
    running_runs: number;
};

type ChartPoint = {
    date: string;
    label: string;
    value: number;
    secondary?: number;
};

type TopDomain = {
    id: number;
    name: string;
    domain: string;
    monitors_count: number;
};

type RecentRun = {
    id: number;
    status: string;
    started_at: string | null;
    finished_at: string | null;
    monitor: {
        id: number;
        monster: string | null;
        site: string | null;
        domain: string | null;
    };
};

export default function AdminDashboard({
    stats,
    charts,
    recentRuns,
}: {
    stats: DashboardStats;
    charts: {
        snapshots_daily: ChartPoint[];
        alerts_daily: ChartPoint[];
        top_domains: TopDomain[];
    };
    recentRuns: RecentRun[];
}) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Admin Operations', 'Admin Operaties')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">
                        {x('Control Center', 'Control Center')}
                    </h2>
                    <p className="mt-1 font-body text-sm text-white/65">
                        {x(
                            'Track monitor health, selector coverage, and scraping volume in one place.',
                            'Volg monitorgezondheid, selector-dekking en scrapevolume op één plek.',
                        )}
                    </p>
                </div>
            }
        >
            <Head title={x('Admin Dashboard', 'Admin Dashboard')} />

            <div className="pb-10 pt-6">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="flex flex-wrap items-center gap-3">
                        <Link
                            href={route('admin.monsters.index')}
                            className={cn(
                                buttonVariants({ variant: 'default', size: 'sm' }),
                                'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                            )}
                        >
                            {x('Manage Monsters', 'Beheer Monsters')}
                        </Link>
                        <Link
                            href={route('admin.monitors.index')}
                            className={cn(
                                buttonVariants({ variant: 'secondary', size: 'sm' }),
                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                            )}
                        >
                            {x('Open Monitors', 'Open Monitoren')}
                        </Link>
                        <Link
                            href={route('admin.alerts.index')}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'border-white/20 bg-transparent text-white hover:bg-white/10',
                            )}
                        >
                            {x('Review Alerts', 'Bekijk Meldingen')}
                        </Link>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label={x('Tracked Monsters', 'Gevolgde Monsters')}
                            value={stats.monsters_total}
                            hint={x('Catalog entries', 'Catalogusitems')}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Active Monitors', 'Actieve Monitoren')}
                            value={`${stats.monitors_active}/${stats.monitors_total}`}
                            hint={x('Currently running', 'Momenteel actief')}
                            accent="cyan"
                        />
                        <KpiCard
                            label={x('Selector Coverage', 'Selector Dekking')}
                            value={`${stats.selector_coverage_percent}%`}
                            hint={`${stats.monitors_with_selector} ${x('configured', 'geconfigureerd')}`}
                            accent="emerald"
                        />
                        <KpiCard
                            label={x('Unread Alerts', 'Ongelezen Meldingen')}
                            value={stats.alerts_unread}
                            hint={`${stats.running_runs} ${x('runs in progress', 'runs bezig')}`}
                            accent="orange"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-2">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="font-display text-lg text-white">
                                    {x(
                                        'Snapshot Throughput (14 days)',
                                        'Snapshot Doorvoer (14 dagen)',
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <TrendLineChart
                                    points={charts.snapshots_daily}
                                    primaryLabel={x('Snapshots', 'Snapshots')}
                                    secondaryLabel={x('Failures', 'Mislukkingen')}
                                />
                                <div className="grid gap-2 font-body text-xs text-white/70 sm:grid-cols-3">
                                    <p>
                                        {x('Last 24h total:', 'Totaal laatste 24u:')}{' '}
                                        <span className="font-semibold text-white">
                                            {stats.snapshots_24h}
                                        </span>
                                    </p>
                                    <p>
                                        {x('Failed:', 'Mislukt:')}{' '}
                                        <span className="font-semibold text-orange-300">
                                            {stats.snapshots_failed_24h}
                                        </span>
                                    </p>
                                    <p>
                                        {x('Success rate:', 'Succesratio:')}{' '}
                                        <span className="font-semibold text-[color:var(--landing-accent)]">
                                            {stats.snapshot_success_percent_24h}%
                                        </span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Alert Activity (14 days)', 'Meldingsactiviteit (14 dagen)')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <TrendLineChart
                                    points={charts.alerts_daily}
                                    primaryLabel={x('Alerts', 'Meldingen')}
                                />
                                <BarMeter
                                    rows={charts.top_domains.map((domain) => ({
                                        id: domain.id,
                                        label: domain.name,
                                        value: domain.monitors_count,
                                        hint: domain.domain,
                                    }))}
                                    emptyLabel={x(
                                        'No domain usage yet.',
                                        'Nog geen domeingebruik.',
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <section>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Recent Monitor Runs', 'Recente Monitorruns')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {recentRuns.length === 0 && (
                                    <p className="font-body text-sm text-white/65">
                                        {x(
                                            'No run history yet. Trigger a monitor to start collecting operational telemetry.',
                                            'Nog geen runhistorie. Start een monitor om operationele telemetrie te verzamelen.',
                                        )}
                                    </p>
                                )}

                                {recentRuns.map((run) => (
                                    <div
                                        key={run.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-body text-sm font-semibold text-white">
                                                {run.monitor.monster ?? x('Unknown monster', 'Onbekende monster')} @{' '}
                                                {run.monitor.site ?? x('Unknown site', 'Onbekende site')}
                                            </p>
                                            <span
                                                className={cn(
                                                    'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]',
                                                    statusClass(run.status),
                                                )}
                                            >
                                                {run.status}
                                            </span>
                                        </div>
                                        <p className="mt-1 font-body text-xs text-white/60">
                                            {run.monitor.domain ?? 'n/a'}
                                        </p>
                                        <p className="mt-2 font-body text-xs text-white/65">
                                            {x('Started', 'Gestart')}:{' '}
                                            {run.started_at
                                                ? new Date(run.started_at).toLocaleString(dateLocale)
                                                : x('N/A', 'N/B')}
                                            {' • '}
                                            {x('Finished', 'Afgerond')}:{' '}
                                            {run.finished_at
                                                ? new Date(run.finished_at).toLocaleString(dateLocale)
                                                : x('N/A', 'N/B')}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function statusClass(status: string): string {
    if (status === 'failed') {
        return 'bg-red-500/20 text-red-200';
    }

    if (status === 'running' || status === 'queued') {
        return 'bg-orange-500/20 text-orange-200';
    }

    if (status === 'ok' || status === 'completed') {
        return 'bg-emerald-500/20 text-emerald-200';
    }

    return 'bg-white/10 text-white/70';
}
