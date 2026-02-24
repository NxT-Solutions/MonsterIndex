import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import Modal from '@/Components/Modal';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, type FormEvent, useMemo, useState } from 'react';

const OTHER_STORE_ID = -1;

type MonitorRow = {
    id: number;
    monster_id: number;
    site_id: number;
    product_url: string;
    currency: string;
    check_interval_minutes: number;
    next_check_at: string | null;
    active: boolean;
    selector_config: Record<string, unknown> | null;
    monster: {
        id: number;
        name: string;
        slug: string;
    };
    site: {
        id: number;
        name: string;
        domain: string;
    };
    latest_snapshot?: {
        checked_at: string | null;
        effective_total_cents: number | null;
        currency: string;
        status: string;
    } | null;
    latest_run?: {
        id: number;
        status: string;
        started_at: string | null;
        finished_at: string | null;
        error_message: string | null;
    } | null;
};

type Option = {
    id: number;
    name: string;
};

type SiteOption = Option & {
    domain: string;
};

type BookmarkletSession = {
    token: string;
    expires_at: string;
    selector_browser_url: string;
};

type RunsEventPayload = {
    running_monitor_ids: number[];
    timestamp: string;
};

export default function MonitorsIndex({
    monitors,
    monsters,
    sites,
}: {
    monitors: MonitorRow[];
    monsters: Option[];
    sites: SiteOption[];
}) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    const form = useForm({
        monster_id: monsters[0]?.id ?? 0,
        site_id: sites[0]?.id ?? OTHER_STORE_ID,
        site_name: '',
        product_url: '',
        check_interval_minutes: 60,
        active: true,
    });

    const [loadingRun, setLoadingRun] = useState<number | null>(null);
    const [loadingSelector, setLoadingSelector] = useState<number | null>(null);
    const [editingMonitor, setEditingMonitor] = useState<MonitorRow | null>(null);
    const [runningMonitorIds, setRunningMonitorIds] = useState<number[]>(
        () => initialRunningMonitorIds(monitors),
    );
    const editForm = useForm({
        monster_id: 0,
        site_id: 0,
        product_url: '',
        check_interval_minutes: 60,
        active: true,
    });
    const runningMonitorSet = useMemo(
        () => new Set(runningMonitorIds),
        [runningMonitorIds],
    );

    const stats = useMemo(() => {
        const active = monitors.filter((monitor) => monitor.active).length;
        const configured = monitors.filter((monitor) =>
            hasPriceSelectorConfig(monitor.selector_config),
        ).length;
        const failedLast = monitors.filter(
            (monitor) => monitor.latest_snapshot?.status === 'failed',
        ).length;

        return {
            total: monitors.length,
            active,
            inactive: monitors.length - active,
            configured,
            failedLast,
        };
    }, [monitors]);

    const barRows = useMemo(() => {
        return [
            {
                id: 'configured',
                label: x('Selector configured', 'Selector geconfigureerd'),
                value: stats.configured,
            },
            {
                id: 'active',
                label: x('Active monitors', 'Actieve monitoren'),
                value: stats.active,
            },
            {
                id: 'failed',
                label: x('Last run failed', 'Laatste run mislukt'),
                value: stats.failedLast,
            },
            {
                id: 'running',
                label: x('Running now', 'Nu bezig'),
                value: runningMonitorIds.length,
            },
        ];
    }, [runningMonitorIds.length, stats, x]);

    useEffect(() => {
        setRunningMonitorIds(initialRunningMonitorIds(monitors));
    }, [monitors]);

    useEffect(() => {
        let source: EventSource | null = null;
        let reconnectTimer: number | null = null;

        const connect = () => {
            source = new EventSource(route('api.admin.monitors.events'));

            source.addEventListener('monitor-runs', (event) => {
                if (!(event instanceof MessageEvent)) {
                    return;
                }

                const payload = parseRunsEvent(event.data);
                if (!payload) {
                    return;
                }

                const nextRunning = payload.running_monitor_ids;
                setRunningMonitorIds((currentRunning) => {
                    const completed = currentRunning.filter(
                        (monitorId) => !nextRunning.includes(monitorId),
                    );

                    if (completed.length > 0) {
                        router.reload({
                            only: ['monitors'],
                        });
                    }

                    return nextRunning;
                });
            });

            source.onerror = () => {
                if (source) {
                    source.close();
                    source = null;
                }

                if (reconnectTimer !== null) {
                    return;
                }

                reconnectTimer = window.setTimeout(() => {
                    reconnectTimer = null;
                    connect();
                }, 1500);
            };
        };

        connect();

        return () => {
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
            }

            if (source) {
                source.close();
            }
        };
    }, []);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            site_id: data.site_id === OTHER_STORE_ID ? null : data.site_id,
            create_site: data.site_id === OTHER_STORE_ID,
            site_name:
                data.site_id === OTHER_STORE_ID
                    ? data.site_name.trim() || null
                    : null,
        }));

        form.post(route('admin.monitors.store'), {
            onSuccess: () => form.reset('product_url', 'site_name'),
        });
    };

    const runNow = async (monitor: MonitorRow) => {
        setLoadingRun(monitor.id);

        try {
            await axios.post(route('api.admin.monitors.run-now', monitor.id));
        } finally {
            setLoadingRun(null);
        }
    };

    const openSelectorBrowser = async (monitor: MonitorRow) => {
        const targetUrl = window
            .prompt(
                x('Open selector for URL', 'Open selector voor URL'),
                monitor.product_url,
            )
            ?.trim();
        if (!targetUrl) {
            return;
        }

        setLoadingSelector(monitor.id);

        try {
            const response = await axios.post<BookmarkletSession>(
                route('api.bookmarklet.session'),
                {
                    monitor_id: monitor.id,
                    lang: locale,
                },
            );

            const selectorBrowserUrl = new URL(
                response.data.selector_browser_url,
            );
            selectorBrowserUrl.searchParams.set('url', targetUrl);
            selectorBrowserUrl.searchParams.set('lang', locale);
            window.open(
                selectorBrowserUrl.toString(),
                '_blank',
                'noopener,noreferrer',
            );
        } catch {
            window.alert(
                x(
                    'Could not create a selector session. Reload and try again.',
                    'Kon geen selectorsessie maken. Herlaad en probeer opnieuw.',
                ),
            );
        } finally {
            setLoadingSelector(null);
        }
    };

    const openEditModal = (monitor: MonitorRow) => {
        setEditingMonitor(monitor);
        editForm.setData('monster_id', monitor.monster_id);
        editForm.setData('site_id', monitor.site_id);
        editForm.setData('product_url', monitor.product_url);
        editForm.setData('check_interval_minutes', monitor.check_interval_minutes);
        editForm.setData('active', monitor.active);
        editForm.clearErrors();
    };

    const closeEditModal = () => {
        setEditingMonitor(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitEditMonitor = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingMonitor) {
            return;
        }

        editForm.transform((data) => ({
            ...data,
            product_url: data.product_url.trim(),
        }));

        editForm.put(route('admin.monitors.update', editingMonitor.id), {
            preserveScroll: true,
            onSuccess: closeEditModal,
        });
    };

    const toggleMonitor = (monitor: MonitorRow) => {
        router.put(route('admin.monitors.update', monitor.id), {
            monster_id: monitor.monster_id,
            site_id: monitor.site_id,
            product_url: monitor.product_url,
            check_interval_minutes: monitor.check_interval_minutes,
            active: !monitor.active,
        });
    };

    const isOtherStoreSelected = form.data.site_id === OTHER_STORE_ID;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Automation', 'Automatisering')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Monitors', 'Monitoren')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Admin Monitors', 'Admin Monitoren')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <KpiCard
                            label={x('Total Monitors', 'Totaal Monitoren')}
                            value={stats.total}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Active', 'Actief')}
                            value={stats.active}
                            accent="emerald"
                        />
                        <KpiCard
                            label={x('Inactive', 'Inactief')}
                            value={stats.inactive}
                            accent="orange"
                        />
                        <KpiCard
                            label={x('Selector Ready', 'Selector Klaar')}
                            value={stats.configured}
                            accent="cyan"
                        />
                        <KpiCard
                            label={x('Failed Last Run', 'Mislukte Laatste Run')}
                            value={stats.failedLast}
                            accent="orange"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Create Monitor', 'Monitor Maken')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    className="grid gap-3 md:grid-cols-12"
                                    onSubmit={submit}
                                >
                                    <div className="min-w-0 space-y-1.5 md:col-span-4">
                                        <label
                                            htmlFor="create-monitor-monster"
                                            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Monster', 'Monster')}
                                        </label>
                                        <select
                                            id="create-monitor-monster"
                                            className="w-full min-w-0 rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
                                            value={form.data.monster_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    'monster_id',
                                                    Number(event.target.value),
                                                )
                                            }
                                        >
                                            {monsters.map((monster) => (
                                                <option
                                                    key={monster.id}
                                                    value={monster.id}
                                                    className="text-black"
                                                >
                                                    {monster.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="min-w-0 space-y-1.5 md:col-span-4">
                                        <label
                                            htmlFor="create-monitor-store"
                                            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Store', 'Winkel')}
                                        </label>
                                        <select
                                            id="create-monitor-store"
                                            className="w-full min-w-0 rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
                                            value={form.data.site_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    'site_id',
                                                    Number(event.target.value),
                                                )
                                            }
                                        >
                                            {sites.map((site) => (
                                                <option key={site.id} value={site.id} className="text-black">
                                                    {site.name} ({site.domain})
                                                </option>
                                            ))}
                                            <option value={OTHER_STORE_ID} className="text-black">
                                                {x(
                                                    'Other (create from URL)',
                                                    'Andere (maak aan via URL)',
                                                )}
                                            </option>
                                        </select>
                                    </div>

                                    <div className="min-w-0 space-y-1.5 md:col-span-4">
                                        <label
                                            htmlFor="create-monitor-currency"
                                            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Currency', 'Valuta')}
                                        </label>
                                        <input
                                            id="create-monitor-currency"
                                            value="EUR"
                                            disabled
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white/70"
                                        />
                                    </div>

                                    {isOtherStoreSelected && (
                                        <div className="min-w-0 space-y-1.5 md:col-span-12">
                                            <label
                                                htmlFor="create-monitor-site-name"
                                                className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                            >
                                                {x(
                                                    'Store name (optional)',
                                                    'Winkelnaam (optioneel)',
                                                )}
                                            </label>
                                            <input
                                                id="create-monitor-site-name"
                                                className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                                placeholder={x(
                                                    'Example: Small Energy Shop',
                                                    'Voorbeeld: Kleine Energy Shop',
                                                )}
                                                value={form.data.site_name}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'site_name',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    )}

                                    <div className="min-w-0 space-y-1.5 md:col-span-9">
                                        <label
                                            htmlFor="create-monitor-product-url"
                                            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Product URL', 'Product-URL')}
                                        </label>
                                        <input
                                            id="create-monitor-product-url"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={x('Product URL', 'Product-URL')}
                                            value={form.data.product_url}
                                            onChange={(event) =>
                                                form.setData(
                                                    'product_url',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="min-w-0 space-y-1.5 md:col-span-3">
                                        <label
                                            htmlFor="create-monitor-interval"
                                            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Interval (minutes)', 'Interval (minuten)')}
                                        </label>
                                        <input
                                            id="create-monitor-interval"
                                            type="number"
                                            min={15}
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={x(
                                                'Interval minutes',
                                                'Interval minuten',
                                            )}
                                            value={form.data.check_interval_minutes}
                                            onChange={(event) =>
                                                form.setData(
                                                    'check_interval_minutes',
                                                    Number(event.target.value),
                                                )
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="min-w-0 md:col-span-12 md:flex md:justify-end">
                                        <button
                                            type="submit"
                                            className={cn(
                                                buttonVariants({
                                                    variant: 'default',
                                                }),
                                                'w-full bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95 sm:w-auto sm:min-w-32',
                                            )}
                                            disabled={form.processing}
                                        >
                                            {x('Create', 'Maken')}
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Monitor Health', 'Monitorgezondheid')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarMeter
                                    rows={barRows}
                                    emptyLabel={x(
                                        'No monitor stats yet.',
                                        'Nog geen monitorstatistieken.',
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Monitor List', 'Monitorlijst')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {monitors.length === 0 && (
                                <p className="text-sm text-white/65">
                                    {x('No monitors yet.', 'Nog geen monitoren.')}
                                </p>
                            )}

                            {monitors.map((monitor) => {
                                const isQueueing = loadingRun === monitor.id;
                                const isRunning = runningMonitorSet.has(monitor.id);

                                return (
                                    <article
                                        key={monitor.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1 text-sm text-white/75">
                                                <p className="font-semibold text-white">
                                                    {monitor.monster.name} @ {monitor.site.name}
                                                </p>
                                                <p className="break-all text-white/65">{monitor.product_url}</p>
                                                <p>
                                                    {x('Interval:', 'Interval:')}{' '}
                                                    {monitor.check_interval_minutes}m •{' '}
                                                    {x('Currency:', 'Valuta:')} EUR •{' '}
                                                    {x('Active:', 'Actief:')}{' '}
                                                    {monitor.active
                                                        ? x('Yes', 'Ja')
                                                        : x('No', 'Nee')}
                                                </p>
                                                <p>
                                                    {x('Next check:', 'Volgende check:')}{' '}
                                                    {monitor.next_check_at
                                                        ? new Date(
                                                              monitor.next_check_at,
                                                          ).toLocaleString(dateLocale)
                                                        : x('N/A', 'N/B')}
                                                </p>
                                                {monitor.latest_snapshot && (
                                                    <p>
                                                        {x('Latest:', 'Laatste:')}{' '}
                                                        {monitor.latest_snapshot
                                                            .effective_total_cents !==
                                                        null
                                                            ? `${monitor.latest_snapshot.currency} ${(monitor.latest_snapshot.effective_total_cents / 100).toFixed(2)}`
                                                            : x('N/A', 'N/B')}
                                                        {' • '}
                                                        {
                                                            monitor.latest_snapshot
                                                                .status
                                                        }
                                                    </p>
                                                )}
                                                <div className="mt-3">
                                                    {isRunning ? (
                                                        <div className="max-w-xs space-y-1.5">
                                                            <div className="flex items-center gap-2 text-xs font-medium text-orange-200">
                                                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-orange-300 border-t-transparent" />
                                                                {x(
                                                                    'Scraping now...',
                                                                    'Nu aan het scrapen...',
                                                                )}
                                                            </div>
                                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-orange-900/40">
                                                                <div className="h-full w-1/2 animate-pulse rounded bg-orange-300" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-white/55">
                                                            {x('Idle', 'Inactief')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'outline',
                                                        size: 'sm',
                                                    }),
                                                    'border-white/20 bg-transparent text-white hover:bg-white/10',
                                                )}
                                                onClick={() => openEditModal(monitor)}
                                            >
                                                {x('Edit', 'Bewerken')}
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'secondary',
                                                        size: 'sm',
                                                    }),
                                                    'border border-white/15 bg-white/5 text-white hover:bg-white/10',
                                                )}
                                                onClick={() =>
                                                    toggleMonitor(monitor)
                                                }
                                            >
                                                {monitor.active
                                                    ? x('Disable', 'Uitschakelen')
                                                    : x('Enable', 'Inschakelen')}
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'default',
                                                        size: 'sm',
                                                    }),
                                                    'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                                )}
                                                disabled={isQueueing || isRunning}
                                                onClick={() => runNow(monitor)}
                                            >
                                                {isQueueing
                                                    ? x('Queueing...', 'In wachtrij...')
                                                    : isRunning
                                                      ? x('Running...', 'Draait...')
                                                      : x('Run Now', 'Nu Draaien')}
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'outline',
                                                        size: 'sm',
                                                    }),
                                                    'border-white/20 bg-transparent text-white hover:bg-white/10',
                                                )}
                                                disabled={loadingSelector === monitor.id}
                                                onClick={() =>
                                                    openSelectorBrowser(monitor)
                                                }
                                            >
                                                {loadingSelector === monitor.id
                                                    ? x('Opening...', 'Openen...')
                                                    : x(
                                                          'Open Selector',
                                                          'Open Selector',
                                                      )}
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'secondary',
                                                        size: 'sm',
                                                    }),
                                                    'border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20',
                                                )}
                                                onClick={() =>
                                                    router.delete(
                                                        route(
                                                            'admin.monitors.destroy',
                                                            monitor.id,
                                                        ),
                                                    )
                                                }
                                            >
                                                {x('Delete', 'Verwijderen')}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Modal show={editingMonitor !== null} maxWidth="2xl" onClose={closeEditModal}>
                <form
                    onSubmit={submitEditMonitor}
                    className="space-y-5 bg-[color:var(--landing-surface)] p-6 text-white"
                >
                    <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--landing-accent)]">
                            {x('Monitor', 'Monitor')}
                        </p>
                        <h3 className="mt-1 font-display text-xl font-semibold">
                            {x('Edit Monitor', 'Monitor Bewerken')}
                        </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="block text-xs uppercase tracking-[0.12em] text-white/60">
                                {x('Monster', 'Monster')}
                            </label>
                            <input
                                value={editingMonitor?.monster.name ?? ''}
                                disabled
                                className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white/70"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs uppercase tracking-[0.12em] text-white/60">
                                {x('Store', 'Winkel')}
                            </label>
                            <input
                                value={
                                    editingMonitor
                                        ? `${editingMonitor.site.name} (${editingMonitor.site.domain})`
                                        : ''
                                }
                                disabled
                                className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white/70"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label
                            htmlFor="edit-monitor-product-url"
                            className="block text-xs uppercase tracking-[0.12em] text-white/60"
                        >
                            {x('Product URL', 'Product-URL')}
                        </label>
                        <input
                            id="edit-monitor-product-url"
                            value={editForm.data.product_url}
                            onChange={(event) =>
                                editForm.setData('product_url', event.target.value)
                            }
                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent-soft)]"
                            placeholder="https://example.com/product-url"
                            required
                        />
                        {editForm.errors.product_url && (
                            <p className="text-xs text-red-300">{editForm.errors.product_url}</p>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div className="space-y-1">
                            <label
                                htmlFor="edit-monitor-interval"
                                className="block text-xs uppercase tracking-[0.12em] text-white/60"
                            >
                                {x('Interval (minutes)', 'Interval (minuten)')}
                            </label>
                            <input
                                id="edit-monitor-interval"
                                type="number"
                                min={15}
                                max={1440}
                                value={editForm.data.check_interval_minutes}
                                onChange={(event) =>
                                    editForm.setData(
                                        'check_interval_minutes',
                                        Number(event.target.value),
                                    )
                                }
                                className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent-soft)]"
                                required
                            />
                            {editForm.errors.check_interval_minutes && (
                                <p className="text-xs text-red-300">
                                    {editForm.errors.check_interval_minutes}
                                </p>
                            )}
                        </div>

                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white">
                            <input
                                type="checkbox"
                                checked={editForm.data.active}
                                onChange={(event) =>
                                    editForm.setData('active', event.target.checked)
                                }
                                className="h-4 w-4 rounded border-white/40 bg-transparent text-[color:var(--landing-accent)] focus:ring-[color:var(--landing-accent)]"
                            />
                            {x('Active', 'Actief')}
                        </label>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            className={cn(
                                buttonVariants({ variant: 'outline' }),
                                'border-white/20 bg-transparent text-white hover:bg-white/10',
                            )}
                            onClick={closeEditModal}
                            disabled={editForm.processing}
                        >
                            {x('Cancel', 'Annuleren')}
                        </button>
                        <button
                            type="submit"
                            className={cn(
                                buttonVariants({ variant: 'default' }),
                                'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                            )}
                            disabled={editForm.processing}
                        >
                            {editForm.processing
                                ? x('Saving...', 'Opslaan...')
                                : x('Save Changes', 'Wijzigingen Opslaan')}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}

function hasPriceSelectorConfig(selectorConfig: Record<string, unknown> | null): boolean {
    if (!selectorConfig) {
        return false;
    }

    const price = selectorConfig.price as
        | {
              css?: string;
              xpath?: string;
              parts?: Array<{ css?: string; xpath?: string }>;
          }
        | undefined;

    if ((price?.css ?? '').trim() || (price?.xpath ?? '').trim()) {
        return true;
    }

    return (price?.parts ?? []).some(
        (part) => (part.css ?? '').trim() !== '' || (part.xpath ?? '').trim() !== '',
    );
}

function isActiveRunStatus(status?: string | null): boolean {
    return status === 'running';
}

function initialRunningMonitorIds(records: MonitorRow[]): number[] {
    return records
        .filter(
            (record) =>
                isActiveRunStatus(record.latest_run?.status) &&
                record.latest_run?.finished_at === null,
        )
        .map((record) => record.id)
        .sort((a, b) => a - b);
}

function parseRunsEvent(rawData: string): RunsEventPayload | null {
    try {
        const payload = JSON.parse(rawData) as Partial<RunsEventPayload>;
        if (!Array.isArray(payload.running_monitor_ids)) {
            return null;
        }

        const runningMonitorIds = payload.running_monitor_ids
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0)
            .sort((a, b) => a - b);

        return {
            running_monitor_ids: Array.from(new Set(runningMonitorIds)),
            timestamp:
                typeof payload.timestamp === 'string'
                    ? payload.timestamp
                    : new Date().toISOString(),
        };
    } catch {
        return null;
    }
}
