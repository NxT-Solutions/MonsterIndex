import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { currencyOptionsForLocale } from '@/lib/currencies';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { type FormEvent, useMemo, useState } from 'react';

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
    const currencyOptions = useMemo(
        () => currencyOptionsForLocale(locale),
        [locale],
    );

    const form = useForm({
        monster_id: monsters[0]?.id ?? 0,
        site_id: sites[0]?.id ?? 0,
        product_url: '',
        currency: 'EUR',
        check_interval_minutes: 60,
        active: true,
    });

    const [loadingRun, setLoadingRun] = useState<number | null>(null);
    const [loadingSelector, setLoadingSelector] = useState<number | null>(null);

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
        ];
    }, [stats, x]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('admin.monitors.store'), {
            onSuccess: () => form.reset('product_url'),
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

    const editMonitor = (monitor: MonitorRow) => {
        const productUrl =
            window.prompt(
                x('Product URL', 'Product-URL'),
                monitor.product_url,
            ) ??
            monitor.product_url;
        const currency =
            window.prompt(
                x('Currency (3-letter)', 'Valuta (3 letters)'),
                monitor.currency,
            ) ??
            monitor.currency;
        const interval = Number(
            window.prompt(
                x('Check interval minutes', 'Controle-interval minuten'),
                String(monitor.check_interval_minutes),
            ) ?? monitor.check_interval_minutes,
        );

        if (!productUrl || !currency || !Number.isFinite(interval)) {
            return;
        }

        router.put(route('admin.monitors.update', monitor.id), {
            monster_id: monitor.monster_id,
            site_id: monitor.site_id,
            product_url: productUrl,
            currency,
            check_interval_minutes: interval,
            active: monitor.active,
        });
    };

    const toggleMonitor = (monitor: MonitorRow) => {
        router.put(route('admin.monitors.update', monitor.id), {
            monster_id: monitor.monster_id,
            site_id: monitor.site_id,
            product_url: monitor.product_url,
            currency: monitor.currency,
            check_interval_minutes: monitor.check_interval_minutes,
            active: !monitor.active,
        });
    };

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
                                    className="grid gap-3 md:grid-cols-3"
                                    onSubmit={submit}
                                >
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="create-monitor-monster"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Monster', 'Monster')}
                                        </label>
                                        <select
                                            id="create-monitor-monster"
                                            className="rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
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

                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="create-monitor-store"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Store', 'Winkel')}
                                        </label>
                                        <select
                                            id="create-monitor-store"
                                            className="rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
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
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="create-monitor-currency"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Currency', 'Valuta')}
                                        </label>
                                        <select
                                            id="create-monitor-currency"
                                            className="rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
                                            value={form.data.currency}
                                            onChange={(event) =>
                                                form.setData(
                                                    'currency',
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            {currencyOptions.map((currency) => (
                                                <option
                                                    key={currency.code}
                                                    value={currency.code}
                                                    className="text-black"
                                                >
                                                    {currency.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <label
                                            htmlFor="create-monitor-product-url"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
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

                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="create-monitor-interval"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Interval (minutes)', 'Interval (minuten)')}
                                        </label>
                                        <div className="flex gap-3">
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
                                            <button
                                                type="submit"
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'default',
                                                    }),
                                                    'shrink-0 bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                                )}
                                                disabled={form.processing}
                                            >
                                                {x('Create', 'Maken')}
                                            </button>
                                        </div>
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

                            {monitors.map((monitor) => (
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
                                                {x('Currency:', 'Valuta:')} {monitor.currency} •{' '}
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
                                                onClick={() => editMonitor(monitor)}
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
                                                disabled={loadingRun === monitor.id}
                                                onClick={() => runNow(monitor)}
                                            >
                                                {loadingRun === monitor.id
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
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
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
