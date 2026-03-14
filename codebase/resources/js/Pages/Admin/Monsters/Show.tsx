import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import Modal from '@/Components/Modal';
import { useAppDialogs } from '@/Components/providers/AppDialogProvider';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

type MonsterDetail = {
    id: number;
    name: string;
    slug: string;
    size_label: string | null;
    active: boolean;
    monitors: MonitorRecord[];
};

type MonitorRecord = {
    id: number;
    product_url: string;
    currency: string;
    check_interval_minutes: number;
    active: boolean;
    next_check_at: string | null;
    selector_config: Record<string, unknown> | null;
    site: {
        id: number;
        name: string;
        domain: string;
    };
    latest_snapshot?: {
        checked_at: string | null;
        effective_total_cents: number | null;
        can_count: number | null;
        price_per_can_cents: number | null;
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

type BookmarkletSession = {
    selector_browser_url: string;
};

type RunsEventPayload = {
    running_monitor_ids: number[];
    timestamp: string;
};

export default function MonsterShow({ monster }: { monster: MonsterDetail }) {
    const { locale, x } = useLocale();
    const { confirm } = useAppDialogs();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    const form = useForm({
        site_name: '',
        product_url: '',
        check_interval_minutes: 60,
        active: true,
    });
    const editForm = useForm({
        monster_id: monster.id,
        site_id: 0,
        product_url: '',
        check_interval_minutes: 60,
        active: true,
    });

    const [loadingSelector, setLoadingSelector] = useState<number | null>(null);
    const [loadingRun, setLoadingRun] = useState<number | null>(null);
    const [editingMonitor, setEditingMonitor] = useState<MonitorRecord | null>(
        null,
    );
    const [runningMonitorIds, setRunningMonitorIds] = useState<number[]>(
        () => initialRunningMonitorIds(monster.monitors),
    );
    const runningMonitorSet = useMemo(
        () => new Set(runningMonitorIds),
        [runningMonitorIds],
    );

    const stats = useMemo(() => {
        const configured = monster.monitors.filter((record) =>
            hasPriceSelector(record),
        ).length;
        const failed = monster.monitors.filter(
            (record) => record.latest_snapshot?.status === 'failed',
        ).length;
        const withPrice = monster.monitors.filter(
            (record) => record.latest_snapshot?.effective_total_cents !== null,
        ).length;

        return {
            total: monster.monitors.length,
            configured,
            failed,
            withPrice,
        };
    }, [monster.monitors]);

    const healthRows = useMemo(() => {
        return [
            {
                id: 'configured',
                label: x('Selector configured', 'Selector geconfigureerd'),
                value: stats.configured,
            },
            {
                id: 'priced',
                label: x('Price detected', 'Prijs gedetecteerd'),
                value: stats.withPrice,
            },
            {
                id: 'running',
                label: x('Running now', 'Nu bezig'),
                value: runningMonitorIds.length,
            },
            {
                id: 'failed',
                label: x('Failed latest', 'Laatste mislukt'),
                value: stats.failed,
            },
        ];
    }, [runningMonitorIds.length, stats, x]);

    useEffect(() => {
        setRunningMonitorIds(initialRunningMonitorIds(monster.monitors));
    }, [monster.monitors]);

    useEffect(() => {
        let source: EventSource | null = null;
        let reconnectTimer: number | null = null;

        const connect = () => {
            source = new EventSource(
                route('api.admin.monsters.records.events', monster.slug),
            );

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
                            only: ['monster'],
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
    }, [monster.slug]);

    const submitRecord = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('admin.monsters.records.store', monster.slug), {
            onSuccess: () => form.reset('site_name', 'product_url'),
        });
    };

    const openSelector = async (record: MonitorRecord) => {
        setLoadingSelector(record.id);

        try {
            const response = await axios.post<BookmarkletSession>(
                route('api.bookmarklet.session'),
                {
                    monitor_id: record.id,
                    lang: locale,
                },
            );

            const selectorBrowserUrl = new URL(response.data.selector_browser_url);
            selectorBrowserUrl.searchParams.set('url', record.product_url);
            selectorBrowserUrl.searchParams.set('lang', locale);
            window.location.assign(selectorBrowserUrl.toString());
        } catch {
            toast.error(
                x(
                    'Could not open selector browser. Try reloading this page.',
                    'Kon de selectorbrowser niet openen. Probeer deze pagina opnieuw te laden.',
                ),
            );
        } finally {
            setLoadingSelector(null);
        }
    };

    const runNow = async (record: MonitorRecord) => {
        if (runningMonitorSet.has(record.id)) {
            return;
        }

        setLoadingRun(record.id);
        setRunningMonitorIds((currentRunning) => {
            if (currentRunning.includes(record.id)) {
                return currentRunning;
            }

            return [...currentRunning, record.id].sort((a, b) => a - b);
        });

        try {
            await axios.post(route('api.admin.monitors.run-now', record.id));
            toast.success(
                x(
                    'Scrape run queued successfully.',
                    'Scrape-run succesvol ingepland.',
                ),
            );
        } catch {
            setRunningMonitorIds((currentRunning) =>
                currentRunning.filter((monitorId) => monitorId !== record.id),
            );
            toast.error(
                x(
                    'Could not queue this scrape run. Please retry.',
                    'Kon deze scrape-run niet inplannen. Probeer opnieuw.',
                ),
            );
        } finally {
            setLoadingRun(null);
        }
    };

    const openEditModal = (record: MonitorRecord) => {
        setEditingMonitor(record);
        editForm.clearErrors();
        editForm.setData({
            monster_id: monster.id,
            site_id: record.site.id,
            product_url: record.product_url,
            check_interval_minutes: record.check_interval_minutes,
            active: record.active,
        });
    };

    const closeEditModal = () => {
        if (editForm.processing) {
            return;
        }

        setEditingMonitor(null);
        editForm.reset();
    };

    const submitEditMonitor = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingMonitor) {
            return;
        }

        editForm.put(route('admin.monitors.update', editingMonitor.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingMonitor(null);
            },
        });
    };

    const deleteMonitor = async (record: MonitorRecord) => {
        const confirmed = await confirm({
            title: x('Delete this website record?', 'Dit website-record verwijderen?'),
            description: x(
                'This permanently removes the monitor and its selector configuration.',
                'Dit verwijdert de monitor en de selectorconfiguratie permanent.',
            ),
            confirmLabel: x('Delete record', 'Record verwijderen'),
            cancelLabel: x('Cancel', 'Annuleren'),
            destructive: true,
        });

        if (!confirmed) {
            return;
        }

        router.delete(route('admin.monitors.destroy', record.id), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href={route('admin.monsters.index')}
                        className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'border-white/20 bg-transparent text-white hover:bg-white/10',
                        )}
                    >
                        {x('Back', 'Terug')}
                    </Link>
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                            {x('Monster Ops', 'Monster Ops')}
                        </p>
                        <h2 className="font-display text-2xl font-semibold text-white">
                            {monster.name}
                            {monster.size_label ? ` (${monster.size_label})` : ''}
                        </h2>
                    </div>
                </div>
            }
        >
            <Head title={`${x('Monster', 'Monster')}: ${monster.name}`} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label={x('Website Records', 'Website-Records')}
                            value={stats.total}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Selector Ready', 'Selector Klaar')}
                            value={stats.configured}
                            accent="emerald"
                        />
                        <KpiCard
                            label={x('Running', 'Bezig')}
                            value={runningMonitorIds.length}
                            accent="cyan"
                        />
                        <KpiCard
                            label={x('Failed Latest', 'Laatste Mislukt')}
                            value={stats.failed}
                            accent="orange"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Add Website Record', 'Website-Record Toevoegen')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    className="grid gap-3 md:grid-cols-12"
                                    onSubmit={submitRecord}
                                >
                                    <div className="space-y-1 md:col-span-3">
                                        <label className="block text-xs uppercase tracking-[0.12em] text-white/60">
                                            {x('Website Name', 'Websitenaam')}
                                        </label>
                                        <input
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent-soft)]"
                                            placeholder={x('Optional', 'Optioneel')}
                                            value={form.data.site_name}
                                            onChange={(event) =>
                                                form.setData('site_name', event.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-5">
                                        <label className="block text-xs uppercase tracking-[0.12em] text-white/60">
                                            {x('Product URL', 'Product-URL')}
                                        </label>
                                        <input
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent-soft)]"
                                            placeholder="https://example.com/product-url"
                                            value={form.data.product_url}
                                            onChange={(event) =>
                                                form.setData('product_url', event.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="block text-xs uppercase tracking-[0.12em] text-white/60">
                                            {x('Currency', 'Valuta')}
                                        </label>
                                        <input
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white/70"
                                            value="EUR"
                                            disabled
                                        />
                                    </div>
                                    <div className="md:col-span-2 md:self-end">
                                        <button
                                            type="submit"
                                            className={cn(
                                                buttonVariants({ variant: 'default' }),
                                                'w-full bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                            )}
                                            disabled={form.processing}
                                        >
                                            {x('Add Record', 'Record Toevoegen')}
                                        </button>
                                    </div>
                                </form>
                                <p className="mt-2 text-xs text-white/60">
                                    {x(
                                        'After adding the URL, click "Start Guided Selector" to pick price, shipping, and can-count elements visually.',
                                        'Na het toevoegen van de URL klik je op "Start Guided Selector" om prijs-, verzend- en aantalelementen visueel te kiezen.',
                                    )}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Record Health', 'Recordgezondheid')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarMeter
                                    rows={healthRows}
                                    emptyLabel={x(
                                        'No records yet.',
                                        'Nog geen records.',
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Website Records', 'Website-Records')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {monster.monitors.length === 0 ? (
                                <p className="text-sm text-white/65">
                                    {x(
                                        'No records yet. Add a website product URL first.',
                                        'Nog geen records. Voeg eerst een website-product-URL toe.',
                                    )}
                                </p>
                            ) : (
                                monster.monitors.map((record) => (
                                    <article
                                        key={record.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1 text-sm text-white/75">
                                                <p className="font-medium text-white">
                                                    {record.site.name} ({record.site.domain})
                                                </p>
                                                <a
                                                    href={record.product_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="break-all text-white/70 underline"
                                                >
                                                    {record.product_url}
                                                </a>
                                                <p>
                                                    {x('Selector:', 'Selector:')}{' '}
                                                    {hasPriceSelector(record)
                                                        ? x('Configured', 'Geconfigureerd')
                                                        : x('Missing', 'Ontbreekt')}
                                                </p>
                                                <p>
                                                    {x('Latest:', 'Laatste:')}{' '}
                                                    {record.latest_snapshot
                                                        ? latestSnapshotLabel(
                                                              record,
                                                              x,
                                                          )
                                                        : x(
                                                              'No checks yet',
                                                              'Nog geen checks',
                                                          )}
                                                </p>
                                                <p>
                                                    {x('Next Check:', 'Volgende Check:')}{' '}
                                                    {record.next_check_at
                                                        ? new Date(
                                                              record.next_check_at,
                                                          ).toLocaleString(
                                                              dateLocale,
                                                          )
                                                        : x('N/A', 'N/B')}
                                                </p>
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
                                                    onClick={() =>
                                                        openEditModal(record)
                                                    }
                                                >
                                                    {x('Edit', 'Bewerken')}
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
                                                    disabled={
                                                        loadingSelector ===
                                                        record.id
                                                    }
                                                    onClick={() =>
                                                        openSelector(record)
                                                    }
                                                >
                                                    {loadingSelector ===
                                                    record.id
                                                        ? x(
                                                              'Opening...',
                                                              'Openen...',
                                                          )
                                                        : x(
                                                              'Start Guided Selector',
                                                              'Start Guided Selector',
                                                          )}
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
                                                    disabled={
                                                        loadingRun ===
                                                            record.id ||
                                                        runningMonitorSet.has(
                                                            record.id,
                                                        )
                                                    }
                                                    onClick={() => runNow(record)}
                                                >
                                                    {loadingRun === record.id
                                                        ? x(
                                                              'Queueing...',
                                                              'In wachtrij...',
                                                          )
                                                        : runningMonitorSet.has(
                                                                record.id,
                                                            )
                                                          ? x(
                                                                'Running...',
                                                                'Draait...',
                                                            )
                                                          : x(
                                                                'Run Now',
                                                                'Nu Draaien',
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
                                                    onClick={() => void deleteMonitor(record)}
                                                >
                                                    {x(
                                                        'Delete',
                                                        'Verwijderen',
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            {runningMonitorSet.has(record.id) ? (
                                                <div className="max-w-xs space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-orange-200">
                                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-orange-300 border-t-transparent" />
                                                        {x(
                                                            'Scraping now...',
                                                            'Nu aan het scrapen...',
                                                        )}
                                                    </div>
                                                    <div className="h-1.5 overflow-hidden rounded bg-orange-900/40">
                                                        <div className="h-full w-1/2 animate-pulse rounded bg-orange-300" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-white/55">
                                                    {x('Idle', 'Inactief')}
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                ))
                            )}
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
                            {x('Edit Website Record', 'Website-Record Bewerken')}
                        </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
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
                        <div className="space-y-1">
                            <label className="block text-xs uppercase tracking-[0.12em] text-white/60">
                                {x('Currency', 'Valuta')}
                            </label>
                            <input
                                value="EUR"
                                disabled
                                className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white/70"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label
                            htmlFor="edit-record-product-url"
                            className="block text-xs uppercase tracking-[0.12em] text-white/60"
                        >
                            {x('Product URL', 'Product-URL')}
                        </label>
                        <input
                            id="edit-record-product-url"
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
                                htmlFor="edit-record-interval"
                                className="block text-xs uppercase tracking-[0.12em] text-white/60"
                            >
                                {x('Interval (minutes)', 'Interval (minuten)')}
                            </label>
                            <input
                                id="edit-record-interval"
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

function hasPriceSelector(record: MonitorRecord): boolean {
    const selectorConfig = record.selector_config;
    if (!selectorConfig || typeof selectorConfig !== 'object') {
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

function latestSnapshotLabel(
    record: MonitorRecord,
    x: (english: string, dutch: string) => string,
): string {
    const latest = record.latest_snapshot;
    if (!latest) {
        return x('No checks yet', 'Nog geen checks');
    }

    if (latest.effective_total_cents === null) {
        return latest.status;
    }

    const total = `${latest.currency} ${(latest.effective_total_cents / 100).toFixed(2)}`;
    const perCan =
        latest.price_per_can_cents !== null
            ? ` | ${x('per can', 'per blik')} ${latest.currency} ${(latest.price_per_can_cents / 100).toFixed(2)}${latest.can_count !== null ? ` (${latest.can_count} ${x('cans', 'blikjes')})` : ''}`
            : '';

    return `${total}${perCan} (${latest.status})`;
}

function initialRunningMonitorIds(records: MonitorRecord[]): number[] {
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

function isActiveRunStatus(status: string | undefined | null): boolean {
    return status === 'running';
}
