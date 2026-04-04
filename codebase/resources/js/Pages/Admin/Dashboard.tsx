import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import TrendLineChart from '@/Components/admin/TrendLineChart';
import { Badge } from '@/Components/ui/badge';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
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

type BreakdownRow = {
    id: string;
    label: string;
    value: number;
    hint: string;
};

type RecentVisit = {
    id: number;
    path: string;
    title: string;
    page_kind: string;
    channel: string;
    referrer_host: string | null;
    viewer_label: string;
    viewer_email: string | null;
    is_authenticated: boolean;
    duration_seconds: number;
    viewed_at: string | null;
    device_type: string;
};

type TopPage = {
    path: string;
    title: string;
    views: number;
    unique_visitors: number;
    avg_duration_seconds: number;
    engaged_percent: number;
};

type AnalyticsSummary = {
    page_views_30d: number;
    unique_visitors_30d: number;
    sessions_30d: number;
    avg_duration_seconds_30d: number;
    engaged_visits_percent_30d: number;
    repeat_visitors_30d: number;
    registered_users_total: number;
    new_users_30d: number;
    active_signed_in_users_30d: number;
    push_enabled_users: number;
    signed_in_views_30d: number;
    guest_views_30d: number;
    guest_visitors_30d: number;
};

type AnalyticsData = {
    summary: AnalyticsSummary;
    traffic: {
        daily_views: ChartPoint[];
        channels: BreakdownRow[];
        top_referrers: BreakdownRow[];
        recent_visits: RecentVisit[];
    };
    audience: {
        devices: BreakdownRow[];
        browsers: BreakdownRow[];
        locales: BreakdownRow[];
    };
    behavior: {
        community_daily: ChartPoint[];
        top_pages: TopPage[];
        search_terms: BreakdownRow[];
        outbound_domains: BreakdownRow[];
        conversion: {
            follows_30d: number;
            contributor_actions_30d: number;
            push_subscriptions_total: number;
            outbound_clicks_30d: number;
        };
    };
};

export default function AdminDashboard({
    stats,
    charts,
    analytics,
    recentRuns,
    pushTestUsers,
}: {
    stats: DashboardStats;
    charts: {
        snapshots_daily: ChartPoint[];
        alerts_daily: ChartPoint[];
        top_domains: TopDomain[];
    };
    analytics: AnalyticsData;
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
                <div className="max-w-5xl">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {t('Admin Intelligence')}
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
                        {t('Traffic, Users, and Operations')}
                    </h1>
                    <p className="mt-1 min-h-5 max-w-4xl font-body text-sm leading-5 text-white/65">
                        {t('Analyze visitor flow, user behavior, contribution activity, and monitoring health from one dashboard.')}
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

                    <Tabs defaultValue="traffic" className="space-y-2">
                        <TabsList className="flex h-auto flex-wrap bg-white/5">
                            <TabsTrigger value="traffic">{t('Traffic')}</TabsTrigger>
                            <TabsTrigger value="audience">{t('Audience')}</TabsTrigger>
                            <TabsTrigger value="behavior">{t('Behavior')}</TabsTrigger>
                            <TabsTrigger value="operations">{t('Operations')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="traffic" className="space-y-6">
                            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                                <KpiCard
                                    label={t('Page Views (30d)')}
                                    value={analytics.summary.page_views_30d}
                                    hint={t('All tracked visits')}
                                    accent="lime"
                                />
                                <KpiCard
                                    label={t('Unique Visitors')}
                                    value={analytics.summary.unique_visitors_30d}
                                    hint={t('Distinct browsers')}
                                    accent="cyan"
                                />
                                <KpiCard
                                    label={t('Sessions')}
                                    value={analytics.summary.sessions_30d}
                                    hint={t('Browser sessions')}
                                    accent="emerald"
                                />
                                <KpiCard
                                    label={t('Avg Time')}
                                    value={formatDuration(
                                        analytics.summary.avg_duration_seconds_30d,
                                    )}
                                    hint={t('Per tracked page')}
                                    accent="orange"
                                />
                                <KpiCard
                                    label={t('Engaged Visits')}
                                    value={`${analytics.summary.engaged_visits_percent_30d}%`}
                                    hint={t('Scrolled, clicked, or stayed')}
                                    accent="emerald"
                                />
                                <KpiCard
                                    label={t('Repeat Visitors')}
                                    value={analytics.summary.repeat_visitors_30d}
                                    hint={t('2+ visits in 30 days')}
                                    accent="cyan"
                                />
                            </section>

                            <section className="grid gap-4 xl:grid-cols-2">
                                <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Traffic Trend (30 days)')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <TrendLineChart
                                            points={analytics.traffic.daily_views}
                                            primaryLabel={t('Page Views')}
                                            secondaryLabel={t('Visitors')}
                                        />
                                        <div className="grid gap-2 font-body text-xs text-white/70 sm:grid-cols-3">
                                            <p>
                                                {t('Signed-in views:')}{' '}
                                                <span className="font-semibold text-white">
                                                    {analytics.summary.signed_in_views_30d}
                                                </span>
                                            </p>
                                            <p>
                                                {t('Guest views:')}{' '}
                                                <span className="font-semibold text-white">
                                                    {analytics.summary.guest_views_30d}
                                                </span>
                                            </p>
                                            <p>
                                                {t('Guest visitors:')}{' '}
                                                <span className="font-semibold text-white">
                                                    {analytics.summary.guest_visitors_30d}
                                                </span>
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Acquisition Channels')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <BarMeter
                                            rows={analytics.traffic.channels}
                                            emptyLabel={t('No traffic sources tracked yet.')}
                                        />
                                        <BarMeter
                                            rows={analytics.traffic.top_referrers}
                                            emptyLabel={t('No external referrers yet.')}
                                        />
                                    </CardContent>
                                </Card>
                            </section>

                            <section>
                                <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_12px_30px_rgba(0,0,0,.24)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Recent Visits')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {analytics.traffic.recent_visits.length === 0 ? (
                                            <p className="font-body text-sm text-white/65">
                                                {t('Traffic will appear here as soon as the tracker records visits.')}
                                            </p>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Page')}</TableHead>
                                                        <TableHead>{t('Viewer')}</TableHead>
                                                        <TableHead>{t('Source')}</TableHead>
                                                        <TableHead>{t('Device')}</TableHead>
                                                        <TableHead>{t('Time')}</TableHead>
                                                        <TableHead>{t('Seen')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {analytics.traffic.recent_visits.map((visit) => (
                                                        <TableRow key={visit.id}>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <p className="font-medium text-white">
                                                                        {visit.title}
                                                                    </p>
                                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                                                                        <Badge
                                                                            variant={
                                                                                visit.is_authenticated
                                                                                    ? 'accent'
                                                                                    : 'secondary'
                                                                            }
                                                                        >
                                                                            {visit.page_kind}
                                                                        </Badge>
                                                                        <span>{visit.path}</span>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <p className="font-medium text-white">
                                                                        {visit.viewer_label}
                                                                    </p>
                                                                    <p className="text-xs text-white/55">
                                                                        {visit.viewer_email ??
                                                                            t('Anonymous visitor')}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1 text-sm">
                                                                    <p className="text-white">
                                                                        {headline(visit.channel)}
                                                                    </p>
                                                                    <p className="text-xs text-white/55">
                                                                        {visit.referrer_host ??
                                                                            t('Direct')}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-white/75">
                                                                {headline(visit.device_type)}
                                                            </TableCell>
                                                            <TableCell className="text-white/75">
                                                                {formatDuration(
                                                                    visit.duration_seconds,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-white/75">
                                                                {visit.viewed_at
                                                                    ? new Date(
                                                                          visit.viewed_at,
                                                                      ).toLocaleString(
                                                                          dateLocale,
                                                                      )
                                                                    : t('N/A')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </section>
                        </TabsContent>

                        <TabsContent value="audience" className="space-y-6">
                            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <KpiCard
                                    label={t('Registered Users')}
                                    value={analytics.summary.registered_users_total}
                                    hint={t('Total accounts')}
                                    accent="lime"
                                />
                                <KpiCard
                                    label={t('New Users (30d)')}
                                    value={analytics.summary.new_users_30d}
                                    hint={t('Fresh sign-ins')}
                                    accent="cyan"
                                />
                                <KpiCard
                                    label={t('Active Signed-In')}
                                    value={analytics.summary.active_signed_in_users_30d}
                                    hint={t('Users seen in analytics')}
                                    accent="emerald"
                                />
                                <KpiCard
                                    label={t('Push Enabled')}
                                    value={analytics.summary.push_enabled_users}
                                    hint={t('Users with subscriptions')}
                                    accent="orange"
                                />
                            </section>

                            <section className="grid gap-4 xl:grid-cols-3">
                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Device Mix')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <BarMeter
                                            rows={analytics.audience.devices}
                                            emptyLabel={t('No device data yet.')}
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Browsers')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <BarMeter
                                            rows={analytics.audience.browsers}
                                            emptyLabel={t('No browser data yet.')}
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Locales')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <BarMeter
                                            rows={analytics.audience.locales}
                                            emptyLabel={t('No locale data yet.')}
                                        />
                                    </CardContent>
                                </Card>
                            </section>

                            <section className="grid gap-4 lg:grid-cols-2">
                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Signed-In vs Guest')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 sm:grid-cols-2">
                                        <div className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4">
                                            <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                                                {t('Signed-In Views')}
                                            </p>
                                            <p className="mt-2 font-display text-3xl font-bold text-[color:var(--landing-accent)]">
                                                {analytics.summary.signed_in_views_30d}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4">
                                            <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                                                {t('Guest Views')}
                                            </p>
                                            <p className="mt-2 font-display text-3xl font-bold text-cyan-300">
                                                {analytics.summary.guest_views_30d}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('What This Means')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm text-white/70">
                                        <p>
                                            {t('Use signed-in activity to understand feature adoption, and guest traffic to judge how well the public board is attracting new visitors.')}
                                        </p>
                                        <p>
                                            {t('Push-enabled users show how many people are reachable for price alerts without relying on email or social re-engagement.')}
                                        </p>
                                    </CardContent>
                                </Card>
                            </section>
                        </TabsContent>

                        <TabsContent value="behavior" className="space-y-6">
                            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <KpiCard
                                    label={t('Follows (30d)')}
                                    value={analytics.behavior.conversion.follows_30d}
                                    hint={t('Alert opt-ins')}
                                    accent="lime"
                                />
                                <KpiCard
                                    label={t('Contributor Actions')}
                                    value={analytics.behavior.conversion.contributor_actions_30d}
                                    hint={t('Monitors + suggestions')}
                                    accent="cyan"
                                />
                                <KpiCard
                                    label={t('Outbound Clicks')}
                                    value={analytics.behavior.conversion.outbound_clicks_30d}
                                    hint={t('Deal exits to stores')}
                                    accent="orange"
                                />
                                <KpiCard
                                    label={t('Push Subscriptions')}
                                    value={
                                        analytics.behavior.conversion
                                            .push_subscriptions_total
                                    }
                                    hint={t('All connected devices')}
                                    accent="emerald"
                                />
                            </section>

                            <section className="grid gap-4 xl:grid-cols-2">
                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Community Activity')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <TrendLineChart
                                            points={analytics.behavior.community_daily}
                                            primaryLabel={t('Follows')}
                                            secondaryLabel={t('Contributor Actions')}
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Search Terms')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <BarMeter
                                            rows={analytics.behavior.search_terms}
                                            emptyLabel={t('Searches will appear once visitors start filtering the board.')}
                                        />
                                    </CardContent>
                                </Card>
                            </section>

                            <section className="grid gap-4 xl:grid-cols-2">
                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Outbound Domains')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <BarMeter
                                            rows={analytics.behavior.outbound_domains}
                                            emptyLabel={t('No outbound clicks tracked yet.')}
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="font-display text-lg text-white">
                                            {t('Top Pages')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {analytics.behavior.top_pages.length === 0 ? (
                                            <p className="font-body text-sm text-white/65">
                                                {t('Top content will appear once traffic is recorded.')}
                                            </p>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Page')}</TableHead>
                                                        <TableHead>{t('Views')}</TableHead>
                                                        <TableHead>{t('Visitors')}</TableHead>
                                                        <TableHead>{t('Avg Time')}</TableHead>
                                                        <TableHead>{t('Engaged')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {analytics.behavior.top_pages.map((page) => (
                                                        <TableRow key={page.path}>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <p className="font-medium text-white">
                                                                        {page.title}
                                                                    </p>
                                                                    <p className="text-xs text-white/55">
                                                                        {page.path}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{page.views}</TableCell>
                                                            <TableCell>
                                                                {page.unique_visitors}
                                                            </TableCell>
                                                            <TableCell>
                                                                {formatDuration(
                                                                    page.avg_duration_seconds,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {page.engaged_percent}%
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </section>
                        </TabsContent>

                        <TabsContent value="operations" className="space-y-6">
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
                                                            Number(
                                                                event.target.value,
                                                            ),
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
                                                        pushTestForm.setData(
                                                            'title',
                                                            event.target.value,
                                                        )
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
                                                        pushTestForm.setData(
                                                            'body',
                                                            event.target.value,
                                                        )
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
                                                        pushTestForm.setData(
                                                            'url',
                                                            event.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-12 md:flex md:justify-end">
                                                <button
                                                    type="submit"
                                                    className={cn(
                                                        buttonVariants({
                                                            size: 'sm',
                                                        }),
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
                                                    {
                                                        stats.snapshot_success_percent_24h
                                                    }
                                                    %
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
                                                id: String(domain.id),
                                                label: domain.name,
                                                value: domain.monitors_count,
                                                hint: domain.domain,
                                            }))}
                                            emptyLabel={t(
                                                'No domain usage yet.',
                                            )}
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
                                                        {run.monitor.monster ??
                                                            t(
                                                                'Unknown monster',
                                                            )}{' '}
                                                        @{' '}
                                                        {run.monitor.site ??
                                                            t('Unknown site')}
                                                    </p>
                                                    <span
                                                        className={cn(
                                                            'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]',
                                                            statusClass(
                                                                run.status,
                                                            ),
                                                        )}
                                                    >
                                                        {run.status}
                                                    </span>
                                                </div>
                                                <p className="mt-1 font-body text-xs text-white/60">
                                                    {run.monitor.domain ??
                                                        'n/a'}
                                                </p>
                                                <p className="mt-2 font-body text-xs text-white/65">
                                                    {t('Started')}:{' '}
                                                    {run.started_at
                                                        ? new Date(
                                                              run.started_at,
                                                          ).toLocaleString(
                                                              dateLocale,
                                                          )
                                                        : t('N/A')}
                                                    {' • '}
                                                    {t('Finished')}:{' '}
                                                    {run.finished_at
                                                        ? new Date(
                                                              run.finished_at,
                                                          ).toLocaleString(
                                                              dateLocale,
                                                          )
                                                        : t('N/A')}
                                                </p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </section>
                        </TabsContent>
                    </Tabs>
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

function formatDuration(seconds: number): string {
    if (seconds <= 0) {
        return '0s';
    }

    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
        return remainingSeconds > 0
            ? `${minutes}m ${remainingSeconds}s`
            : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function headline(value: string): string {
    return value
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}
