import { useAppDialogs } from '@/Components/providers/AppDialogProvider';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

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
    const { locale, localeTag, t } = useLocale();
    const { confirm } = useAppDialogs();
    const dateLocale = localeTag;

    const form = useForm({
        monster_id: monsters[0]?.id ?? 0,
        site_id: sites[0]?.id ?? OTHER_STORE_ID,
        site_name: '',
        product_url: '',
    });

    const isOtherStore = form.data.site_id === OTHER_STORE_ID;
    const [loadingSelector, setLoadingSelector] = useState<number | null>(null);
    const [submittingMonitor, setSubmittingMonitor] = useState<number | null>(null);
    const [editingMonitor, setEditingMonitor] = useState<MonitorRow | null>(null);
    const editForm = useForm({
        product_url: '',
    });

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
            toast.error(
                t('Could not open selector browser. Reload and try again.'),
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

    const openEditModal = (monitor: MonitorRow) => {
        setEditingMonitor(monitor);
        editForm.setData('product_url', monitor.product_url);
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
            monster_id: editingMonitor.monster_id,
            site_id: editingMonitor.site_id,
            create_site: false,
            site_name: null,
            product_url: data.product_url.trim(),
        }));

        editForm.put(route('contribute.monitors.update', editingMonitor.id), {
            preserveScroll: true,
            onSuccess: () => {
                closeEditModal();
            },
        });
    };

    const deleteOrWithdraw = async (monitor: MonitorRow) => {
        if (monitor.submission_status === 'approved') {
            return;
        }

        const confirmed = await confirm({
            title: t('Delete this monitor draft/proposal?'),
            description: t('This removes the draft or pending proposal from your queue.'),
            confirmLabel: t('Delete'),
            cancelLabel: t('Cancel'),
            destructive: true,
        });

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
                        {t('Community')}
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold text-white">
                        {t('My Monitor Proposals')}
                    </h1>
                </div>
            }
        >
            <Head title={t('My Monitor Proposals')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {t('Create Proposal')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-3 md:grid-cols-12" onSubmit={submitCreate}>
                                <div className="md:col-span-4">
                                    <label
                                        htmlFor="contribute-monitor-monster"
                                        className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                    >
                                        {t('Monster')}
                                    </label>
                                    <select
                                        id="contribute-monitor-monster"
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
                                    <label
                                        htmlFor="contribute-monitor-store"
                                        className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                    >
                                        {t('Store')}
                                    </label>
                                    <select
                                        id="contribute-monitor-store"
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
                                            {t('Other (create from URL)')}
                                        </option>
                                    </select>
                                </div>

                                <div className="md:col-span-4">
                                    <label
                                        htmlFor="contribute-monitor-currency"
                                        className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                    >
                                        {t('Currency')}
                                    </label>
                                    <input
                                        id="contribute-monitor-currency"
                                        className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white/70"
                                        value="EUR"
                                        disabled
                                    />
                                </div>

                                {isOtherStore && (
                                    <div className="md:col-span-12">
                                        <label
                                            htmlFor="contribute-monitor-site-name"
                                            className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {t('Store Name (Optional)')}
                                        </label>
                                        <input
                                            id="contribute-monitor-site-name"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            value={form.data.site_name}
                                            placeholder={t('Example: Energy Shop')}
                                            onChange={(event) => form.setData('site_name', event.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-9">
                                    <label
                                        htmlFor="contribute-monitor-product-url"
                                        className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                    >
                                        {t('Product URL')}
                                    </label>
                                    <input
                                        id="contribute-monitor-product-url"
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
                                        {t('Create Draft')}
                                    </button>
                                </div>

                                <p className="text-xs text-white/60 md:col-span-12">
                                    {t('Fetch interval is fixed at 60 minutes for contributor proposals.')}
                                </p>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {t('My Monitor Queue')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {monitors.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {t('No monitor proposals yet. Create your first draft above.')}
                                </p>
                            ) : (
                                monitors.map((monitor) => {
                                    const isApproved = monitor.submission_status === 'approved';
                                    const selectorConfigured = hasPriceSelectorConfig(
                                        monitor.selector_config,
                                    );

                                    return (
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
                                                <strong className="text-white">{t('URL')}:</strong>{' '}
                                                {monitor.product_url}
                                            </p>
                                            <p>
                                                <strong className="text-white">{t('Validation')}:</strong>{' '}
                                                {monitor.validation_status}
                                            </p>
                                            {monitor.review_note && (
                                                <p>
                                                    <strong className="text-white">{t('Review note')}:</strong>{' '}
                                                    {monitor.review_note}
                                                </p>
                                            )}
                                            <p>
                                                <strong className="text-white">{t('Updated')}:</strong>{' '}
                                                {new Date(monitor.updated_at).toLocaleString(dateLocale)}
                                            </p>
                                        </div>

                                        {!isApproved ? (
                                            <>
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
                                                            ? t('Opening...')
                                                            : t('Configure Selectors')}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => submitForReview(monitor)}
                                                        className={cn(
                                                            buttonVariants({ size: 'sm' }),
                                                            'bg-[color:var(--landing-accent)] text-[#0b1201]',
                                                        )}
                                                        disabled={
                                                            submittingMonitor === monitor.id
                                                            || monitor.submission_status === 'pending_review'
                                                            || !selectorConfigured
                                                        }
                                                    >
                                                        {submittingMonitor === monitor.id
                                                            ? t('Submitting...')
                                                            : t('Submit for Review')}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(monitor)}
                                                        className={cn(
                                                            buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                            'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                                        )}
                                                    >
                                                        {t('Edit')}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => deleteOrWithdraw(monitor)}
                                                        className={cn(
                                                            buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                            'border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20',
                                                        )}
                                                    >
                                                        {t('Delete')}
                                                    </button>
                                                </div>
                                                {!selectorConfigured && (
                                                    <p className="mt-2 text-xs text-amber-200">
                                                        {t('Configure a price selector before submitting for review.')}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="mt-3 text-xs text-white/60">
                                                {t('This monitor is approved and managed by admins.')}
                                            </p>
                                        )}
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {editingMonitor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/70"
                        onClick={closeEditModal}
                        aria-label={t('Close edit dialog')}
                    />
                    <div className="relative z-10 w-full max-w-xl rounded-xl border border-white/15 bg-[color:var(--landing-surface)] p-5 shadow-2xl shadow-black/50">
                        <div className="mb-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--landing-accent)]">
                                {t('Edit Proposal')}
                            </p>
                            <h3 className="mt-1 font-display text-xl font-semibold text-white">
                                {editingMonitor.monster.name}
                            </h3>
                            <p className="mt-1 text-xs text-white/60">
                                {editingMonitor.site.name} ({editingMonitor.site.domain})
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={submitEditMonitor}>
                            <div>
                                <label
                                    htmlFor="contribute-monitor-edit-product-url"
                                    className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60"
                                >
                                    {t('Product URL')}
                                </label>
                                <input
                                    id="contribute-monitor-edit-product-url"
                                    className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                    value={editForm.data.product_url}
                                    placeholder="https://example.com/product/monster"
                                    onChange={(event) =>
                                        editForm.setData('product_url', event.target.value)
                                    }
                                    disabled={editForm.processing}
                                />
                                {editForm.errors.product_url && (
                                    <p className="mt-1 text-xs text-rose-300">
                                        {editForm.errors.product_url}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    className={cn(
                                        buttonVariants({ variant: 'secondary', size: 'sm' }),
                                        'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                    )}
                                    onClick={closeEditModal}
                                    disabled={editForm.processing}
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className={cn(
                                        buttonVariants({ size: 'sm' }),
                                        'bg-[color:var(--landing-accent)] text-[#0b1201]',
                                    )}
                                    disabled={editForm.processing}
                                >
                                    {editForm.processing
                                        ? t('Saving...')
                                        : t('Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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
