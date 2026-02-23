import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { type FormEvent, useState } from 'react';

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

    const form = useForm({
        monster_id: monsters[0]?.id ?? 0,
        site_id: sites[0]?.id ?? 0,
        product_url: '',
        currency: 'USD',
        check_interval_minutes: 60,
        active: true,
    });

    const [loadingRun, setLoadingRun] = useState<number | null>(null);
    const [loadingSelector, setLoadingSelector] = useState<number | null>(null);

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
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    {x('Admin: Monitors', 'Admin: Monitoren')}
                </h2>
            }
        >
            <Head title={x('Admin Monitors', 'Admin Monitoren')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Create Monitor', 'Monitor Maken')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-3"
                                onSubmit={submit}
                            >
                                <select
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                                        >
                                            {monster.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    value={form.data.site_id}
                                    onChange={(event) =>
                                        form.setData(
                                            'site_id',
                                            Number(event.target.value),
                                        )
                                    }
                                >
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.name} ({site.domain})
                                        </option>
                                    ))}
                                </select>

                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder={x('Currency', 'Valuta')}
                                    value={form.data.currency}
                                    onChange={(event) =>
                                        form.setData('currency', event.target.value)
                                    }
                                    required
                                />

                                <input
                                    className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
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

                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        min={15}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                                        className={buttonVariants({
                                            variant: 'default',
                                        })}
                                        disabled={form.processing}
                                    >
                                        {x('Create', 'Maken')}
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Monitors', 'Monitoren')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {monitors.length === 0 && (
                                <p className="text-sm text-slate-600">
                                    {x('No monitors yet.', 'Nog geen monitoren.')}
                                </p>
                            )}

                            {monitors.map((monitor) => (
                                <div
                                    key={monitor.id}
                                    className="rounded-lg border border-slate-200 p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1 text-sm text-slate-700">
                                            <p>
                                                <strong>
                                                    {monitor.monster.name}
                                                </strong>{' '}
                                                @ {monitor.site.name}
                                            </p>
                                            <p>{monitor.product_url}</p>
                                            <p>
                                                {x('Interval:', 'Interval:')}{' '}
                                                {
                                                    monitor.check_interval_minutes
                                                }
                                                m • {x('Currency:', 'Valuta:')}{' '}
                                                {monitor.currency} •{' '}
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
                                                      ).toLocaleString(
                                                          dateLocale,
                                                      )
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
                                                className={buttonVariants({
                                                    variant: 'outline',
                                                    size: 'sm',
                                                })}
                                                onClick={() =>
                                                    editMonitor(monitor)
                                                }
                                            >
                                                {x('Edit', 'Bewerken')}
                                            </button>
                                            <button
                                                type="button"
                                                className={buttonVariants({
                                                    variant: 'secondary',
                                                    size: 'sm',
                                                })}
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
                                                className={buttonVariants({
                                                    variant: 'default',
                                                    size: 'sm',
                                                })}
                                                disabled={
                                                    loadingRun === monitor.id
                                                }
                                                onClick={() => runNow(monitor)}
                                            >
                                                {x('Run Now', 'Nu Draaien')}
                                            </button>
                                            <button
                                                type="button"
                                                className={buttonVariants({
                                                    variant: 'outline',
                                                    size: 'sm',
                                                })}
                                                disabled={
                                                    loadingSelector === monitor.id
                                                }
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
                                                className={buttonVariants({
                                                    variant: 'secondary',
                                                    size: 'sm',
                                                })}
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

                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
