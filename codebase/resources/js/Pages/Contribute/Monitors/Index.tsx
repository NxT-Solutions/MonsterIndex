import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { FormEvent, useState } from 'react';

const OTHER_STORE_ID = -1;

type MonitorRow = {
    id: number;
    monster_id: number;
    site_id: number;
    product_url: string;
    canonical_product_url: string | null;
    currency: string;
    check_interval_minutes: number;
    active: boolean;
    submission_status: string;
    validation_status: string;
    validation_result: Record<string, unknown> | null;
    review_note: string | null;
    selector_config: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    monster: {
        id: number;
        name: string;
        slug: string;
        size_label: string | null;
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

type MonsterOption = {
    id: number;
    name: string;
    slug: string;
    size_label: string | null;
};

type SiteOption = {
    id: number;
    name: string;
    domain: string;
};

type BookmarkletSession = {
    selector_browser_url: string;
};

export default function ContributionMonitorsIndex({
    monitors,
    monsters,
    sites,
}: {
    monitors: MonitorRow[];
    monsters: MonsterOption[];
    sites: SiteOption[];
}) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    const form = useForm({
        monster_id: monsters[0]?.id ?? 0,
        site_id: sites[0]?.id ?? OTHER_STORE_ID,
        site_name: '',
        product_url: '',
    });

    const isOtherStore = form.data.site_id === OTHER_STORE_ID;
    const [loadingSelector, setLoadingSelector] = useState<number | null>(null);
    const [submittingMonitor, setSubmittingMonitor] = useState<number | null>(null);

    const submitCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            site_id: data.site_id === OTHER_STORE_ID ? null : data.site_id,
            create_site: data.site_id === OTHER_STORE_ID,
            site_name: data.site_id === OTHER_STORE_ID ? data.site_name.trim() || null : null,
        }));

        form.post(route('contribute.monitors.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('product_url', 'site_name'),
        });
    };

    const openSelector = async (monitor: MonitorRow) => {
        setLoadingSelector(monitor.id);
        try {
            const response = await axios.post<BookmarkletSession>(route('api.bookmarklet.session'), {
                monitor_id: monitor.id,
                lang: locale,
            });

            const url = new URL(response.data.selector_browser_url);
            url.searchParams.set('url', monitor.product_url);
            url.searchParams.set('lang', locale);
            window.location.assign(url.toString());
        } catch {
            window.alert(
                x(
                    'Could not open selector browser. Reload and try again.',
                    'Kon selectorbrowser niet openen. Herlaad en probeer opnieuw.',
                ),
            );
        } finally {
            setLoadingSelector(null);
        }
    };

    const submitForReview = (monitor: MonitorRow) => {
        setSubmittingMonitor(monitor.id);
        router.post(
            route('contribute.monitors.submit', monitor.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setSubmittingMonitor(null),
            },
        );
    };

    const editMonitor = (monitor: MonitorRow) => {
        const productUrl = window.prompt(
            x('Product URL', 'Product-URL'),
            monitor.product_url,
        )?.trim();
        if (!productUrl) {
            return;
        }

        router.put(
            route('contribute.monitors.update', monitor.id),
            {
                monster_id: monitor.monster_id,
                site_id: monitor.site_id,
                create_site: false,
                site_name: null,
                product_url: productUrl,
            },
            { preserveScroll: true },
        );
    };

    const deleteOrWithdraw = (monitor: MonitorRow) => {
        const confirmed = window.confirm(
            monitor.submission_status === 'approved'
                ? x(
                      'Withdraw this approved monitor from public tracking?',
                      'Deze goedgekeurde monitor uit publieke tracking verwijderen?',
                  )
                : x(
                      'Delete this monitor draft/proposal?',
                      'Deze monitor draft/voorstel verwijderen?',
                  ),
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('contribute.monitors.destroy', monitor.id), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Community', 'Community')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('My Monitor Proposals', 'Mijn Monitorvoorstellen')}
                    </h2>
                </div>
            }
        >
            <Head title={x('My Monitor Proposals', 'Mijn Monitorvoorstellen')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Create Proposal', 'Nieuw Voorstel')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-3 md:grid-cols-12" onSubmit={submitCreate}>
                                <div className="md:col-span-4">
                                    <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                        {x('Monster', 'Monster')}
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
                                        value={form.data.monster_id}
                                        onChange={(event) => form.setData('monster_id', Number(event.target.value))}
                                    >
                                        {monsters.map((monster) => (
                                            <option key={monster.id} value={monster.id} className="text-black">
                                                {monster.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-4">
                                    <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                        {x('Store', 'Winkel')}
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
                                        value={form.data.site_id}
                                        onChange={(event) => form.setData('site_id', Number(event.target.value))}
                                    >
                                        {sites.map((site) => (
                                            <option key={site.id} value={site.id} className="text-black">
                                                {site.name} ({site.domain})
                                            </option>
                                        ))}
                                        <option value={OTHER_STORE_ID} className="text-black">
                                            {x('Other (create from URL)', 'Andere (maak uit URL)')}
                                        </option>
                                    </select>
                                </div>

                                <div className="md:col-span-4">
                                    <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                        {x('Currency', 'Valuta')}
                                    </label>
                                    <input
                                        className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white/70"
                                        value="EUR"
                                        disabled
                                    />
                                </div>

                                {isOtherStore && (
                                    <div className="md:col-span-12">
                                        <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                            {x('Store Name (Optional)', 'Winkelnaam (optioneel)')}
                                        </label>
                                        <input
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            value={form.data.site_name}
                                            placeholder={x('Example: Energy Shop', 'Voorbeeld: Energy Shop')}
                                            onChange={(event) => form.setData('site_name', event.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-9">
                                    <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                        {x('Product URL', 'Product-URL')}
                                    </label>
                                    <input
                                        className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                        value={form.data.product_url}
                                        placeholder="https://example.com/product/monster"
                                        onChange={(event) => form.setData('product_url', event.target.value)}
                                    />
                                </div>

                                <div className="flex items-end md:col-span-3">
                                    <button
                                        type="submit"
                                        className={cn(
                                            buttonVariants({ size: 'sm' }),
                                            'w-full bg-[color:var(--landing-accent)] text-[#0b1201]',
                                        )}
                                        disabled={form.processing}
                                    >
                                        {x('Create Draft', 'Maak Draft')}
                                    </button>
                                </div>

                                <p className="text-xs text-white/60 md:col-span-12">
                                    {x(
                                        'Fetch interval is fixed at 60 minutes for contributor proposals.',
                                        'Het ophaalinterval staat vast op 60 minuten voor bijdragersvoorstellen.',
                                    )}
                                </p>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('My Monitor Queue', 'Mijn Monitorwachtrij')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {monitors.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {x(
                                        'No monitor proposals yet. Create your first draft above.',
                                        'Nog geen monitorvoorstellen. Maak hierboven je eerste draft.',
                                    )}
                                </p>
                            ) : (
                                monitors.map((monitor) => (
                                    <div
                                        key={monitor.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-display text-base text-white">
                                                    {monitor.monster.name}
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    {monitor.site.name} ({monitor.site.domain})
                                                </p>
                                            </div>
                                            <span className="rounded-full border border-white/20 px-2 py-1 text-xs uppercase tracking-[0.08em] text-white/80">
                                                {monitor.submission_status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="mt-2 space-y-1 text-sm text-white/75">
                                            <p>
                                                <strong className="text-white">{x('URL', 'URL')}:</strong>{' '}
                                                {monitor.product_url}
                                            </p>
                                            <p>
                                                <strong className="text-white">{x('Validation', 'Validatie')}:</strong>{' '}
                                                {monitor.validation_status}
                                            </p>
                                            {monitor.review_note && (
                                                <p>
                                                    <strong className="text-white">{x('Review note', 'Reviewnotitie')}:</strong>{' '}
                                                    {monitor.review_note}
                                                </p>
                                            )}
                                            <p>
                                                <strong className="text-white">{x('Updated', 'Bijgewerkt')}:</strong>{' '}
                                                {new Date(monitor.updated_at).toLocaleString(dateLocale)}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openSelector(monitor)}
                                                className={cn(
                                                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                    'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                                )}
                                                disabled={loadingSelector === monitor.id}
                                            >
                                                {loadingSelector === monitor.id
                                                    ? x('Opening...', 'Openen...')
                                                    : x('Configure Selectors', 'Configureer Selectors')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => submitForReview(monitor)}
                                                className={cn(
                                                    buttonVariants({ size: 'sm' }),
                                                    'bg-[color:var(--landing-accent)] text-[#0b1201]',
                                                )}
                                                disabled={submittingMonitor === monitor.id || monitor.submission_status === 'pending_review'}
                                            >
                                                {submittingMonitor === monitor.id
                                                    ? x('Submitting...', 'Indienen...')
                                                    : x('Submit for Review', 'Indienen voor Review')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => editMonitor(monitor)}
                                                className={cn(
                                                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                    'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                                )}
                                            >
                                                {x('Edit', 'Bewerk')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteOrWithdraw(monitor)}
                                                className={cn(
                                                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                    'border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20',
                                                )}
                                            >
                                                {monitor.submission_status === 'approved'
                                                    ? x('Withdraw', 'Intrekken')
                                                    : x('Delete', 'Verwijderen')}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
