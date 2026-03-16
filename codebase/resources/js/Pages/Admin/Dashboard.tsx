import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import TrendLineChart from '@/Components/admin/TrendLineChart';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';

type DashboardStats = {
    monsters_total: number;
    sites_total: number;
    monitors_total: number;
    monitors_active: number;
    monitors_pending_review: number;
    monitors_with_selector: number;
    selector_coverage_percent: number;
    snapshots_24h: number;
    snapshots_failed_24h: number;
    snapshot_success_percent_24h: number;
    alerts_unread: number;
    monster_suggestions_pending: number;
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

type PushTestUser = {
    id: number;
    name: string;
    email: string;
};

export default function AdminDashboard({
    stats,
    charts,
    recentRuns,
    pushTestUsers,
}: {
    stats: DashboardStats;
    charts: {
        snapshots_daily: ChartPoint[];
        alerts_daily: ChartPoint[];
        top_domains: TopDomain[];
    };
    recentRuns: RecentRun[];
    pushTestUsers: PushTestUser[];
}) {
    const { localeTag, t } = useLocale();
    const dateLocale = localeTag;
    const pushTestForm = useForm({
        user_id: pushTestUsers[0]?.id ?? 0,
        title: t('Test notification'),
        body: t('This is a push test from admin.'),
        url: '/dashboard',
    });

    return (
        <AuthenticatedLayout
            header={
                <div className="max-w-4xl">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {t('Admin Operations')}
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
                        {t('Control Center')}
                    </h1>
                    <p className="mt-1 min-h-5 max-w-3xl font-body text-sm leading-5 text-white/65">
                        {t('Track monitor health, selector coverage, and scraping volume in one place.')}
                    </p>
                </div>
            }
        >
            <Head title={t('Admin Dashboard')} />

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
                            {t('Manage Monsters')}
                        </Link>
                        <Link
                            href={route('admin.monitors.index')}
                            className={cn(
                                buttonVariants({ variant: 'secondary', size: 'sm' }),
                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                            )}
                        >
                            {t('Open Monitors')}
                        </Link>
                        <Link
                            href={route('admin.stores.index')}
                            className={cn(
                                buttonVariants({ variant: 'secondary', size: 'sm' }),
                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                            )}
                        >
                            {t('Manage Stores')}
                        </Link>
                        <Link
                            href={route('admin.alerts.index')}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'border-white/20 bg-transparent text-white hover:bg-white/10',
                            )}
                        >
                            {t('Review Alerts')}
                        </Link>
                        <Link
                            href={route('admin.review.monitors.index')}
                            className={cn(
                                buttonVariants({ variant: 'secondary', size: 'sm' }),
                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                            )}
                        >
                            {t('Review Monitor Queue')}
                        </Link>
                        <Link
                            href={route('admin.review.suggestions.index')}
                            className={cn(
                                buttonVariants({ variant: 'secondary', size: 'sm' }),
                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                            )}
                        >
                            {t('Review Suggestions')}
                        </Link>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                        <KpiCard
                            label={t('Tracked Monsters')}
                            value={stats.monsters_total}
                            hint={t('Catalog entries')}
                            accent="lime"
                        />
                        <KpiCard
                            label={t('Active Monitors')}
                            value={`${stats.monitors_active}/${stats.monitors_total}`}
                            hint={t('Currently running')}
                            accent="cyan"
                        />
                        <KpiCard
                            label={t('Selector Coverage')}
                            value={`${stats.selector_coverage_percent}%`}
                            hint={`${stats.monitors_with_selector} ${t('configured')}`}
                            accent="emerald"
                        />
                        <KpiCard
                            label={t('Unread Alerts')}
                            value={stats.alerts_unread}
                            hint={`${stats.running_runs} ${t('runs in progress')}`}
                            accent="orange"
                        />
                        <KpiCard
                            label={t('Pending Monitors')}
                            value={stats.monitors_pending_review}
                            hint={t('Awaiting moderation')}
                            accent="orange"
                        />
                        <KpiCard
                            label={t('Pending Suggestions')}
                            value={stats.monster_suggestions_pending}
                            hint={t('Community backlog')}
                            accent="cyan"
                        />
                    </section>

                    <section>
                        <Card className="min-h-[14rem] border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Push Test Sender')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    className="grid gap-3 md:grid-cols-12"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        pushTestForm.post(route('api.admin.push.test'), {
                                            preserveScroll: true,
                                        });
                                    }}
                                >
                                    <div className="md:col-span-3">
                                        <label
                                            htmlFor="admin-push-test-user"
                                            className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {t('Target User')}
                                        </label>
                                        <select
                                            id="admin-push-test-user"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
                                            value={pushTestForm.data.user_id}
                                            onChange={(event) =>
                                                pushTestForm.setData(
                                                    'user_id',
                                                    Number(event.target.value),
                                                )
                                            }
                                        >
                                            {pushTestUsers.map((user) => (
                                                <option
                                                    key={user.id}
                                                    value={user.id}
                                                    className="text-black"
                                                >
                                                    {user.name} ({user.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label
                                            htmlFor="admin-push-test-title"
                                            className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {t('Title')}
                                        </label>
                                        <input
                                            id="admin-push-test-title"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            value={pushTestForm.data.title}
                                            onChange={(event) =>
                                                pushTestForm.setData('title', event.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label
                                            htmlFor="admin-push-test-body"
                                            className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {t('Body')}
                                        </label>
                                        <input
                                            id="admin-push-test-body"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            value={pushTestForm.data.body}
                                            onChange={(event) =>
                                                pushTestForm.setData('body', event.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            htmlFor="admin-push-test-url"
                                            className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                        >
                                            URL
                                        </label>
                                        <input
                                            id="admin-push-test-url"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            value={pushTestForm.data.url}
                                            onChange={(event) =>
                                                pushTestForm.setData('url', event.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-12 md:flex md:justify-end">
                                        <button
                                            type="submit"
                                            className={cn(
                                                buttonVariants({ size: 'sm' }),
                                                'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                            )}
                                            disabled={
                                                pushTestForm.processing ||
                                                pushTestUsers.length === 0
                                            }
                                        >
                                            {pushTestForm.processing
                                                ? t('Sending...')
                                                : t('Send Push Test')}
                                        </button>
                                    </div>
                                </form>
                                {pushTestUsers.length === 0 && (
                                    <p className="mt-2 text-xs text-white/55">
                                        {t('No users available to target yet.')}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-2">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Snapshot Throughput (14 days)')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <TrendLineChart
                                    points={charts.snapshots_daily}
                                    primaryLabel={t('Snapshots')}
                                    secondaryLabel={t('Failures')}
                                />
                                <div className="grid gap-2 font-body text-xs text-white/70 sm:grid-cols-3">
                                    <p>
                                        {t('Last 24h total:')}{' '}
                                        <span className="font-semibold text-white">
                                            {stats.snapshots_24h}
                                        </span>
                                    </p>
                                    <p>
                                        {t('Failed:')}{' '}
                                        <span className="font-semibold text-orange-300">
                                            {stats.snapshots_failed_24h}
                                        </span>
                                    </p>
                                    <p>
                                        {t('Success rate:')}{' '}
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
                                    {t('Alert Activity (14 days)')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <TrendLineChart
                                    points={charts.alerts_daily}
                                    primaryLabel={t('Alerts')}
                                />
                                <BarMeter
                                    rows={charts.top_domains.map((domain) => ({
                                        id: domain.id,
                                        label: domain.name,
                                        value: domain.monitors_count,
                                        hint: domain.domain,
                                    }))}
                                    emptyLabel={t('No domain usage yet.')}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <section>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Recent Monitor Runs')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {recentRuns.length === 0 && (
                                    <p className="font-body text-sm text-white/65">
                                        {t('No run history yet. Trigger a monitor to start collecting operational telemetry.')}
                                    </p>
                                )}

                                {recentRuns.map((run) => (
                                    <div
                                        key={run.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-body text-sm font-semibold text-white">
                                                {run.monitor.monster ?? t('Unknown monster')} @{' '}
                                                {run.monitor.site ?? t('Unknown site')}
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
                                            {t('Started')}:{' '}
                                            {run.started_at
                                                ? new Date(run.started_at).toLocaleString(dateLocale)
                                                : t('N/A')}
                                            {' • '}
                                            {t('Finished')}:{' '}
                                            {run.finished_at
                                                ? new Date(run.finished_at).toLocaleString(dateLocale)
                                                : t('N/A')}
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
