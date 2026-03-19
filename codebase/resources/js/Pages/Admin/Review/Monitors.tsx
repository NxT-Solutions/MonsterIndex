import { useAppDialogs } from '@/Components/providers/AppDialogProvider';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';

type PendingMonitor = {
    id: number;
    product_url: string;
    currency: string;
    submission_status: string;
    validation_status: string;
    validation_result: Record<string, unknown> | null;
    review_note: string | null;
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
    creator: {
        id: number;
        name: string;
        email: string;
    } | null;
};

export default function MonitorReviewIndex({
    pendingMonitors,
}: {
    pendingMonitors: PendingMonitor[];
}) {
    const { localeTag, t } = useLocale();
    const { confirm, prompt } = useAppDialogs();
    const dateLocale = localeTag;

    const approve = (monitor: PendingMonitor) => {
        router.post(route('admin.review.monitors.approve', monitor.id), {}, { preserveScroll: true });
    };

    const forceApprove = async (monitor: PendingMonitor) => {
        const confirmed = await confirm({
            title: t('Force-approve this monitor even though validation failed?'),
            description: t('Use this only when you have manually verified the selectors and pricing output.'),
            confirmLabel: t('Force approve'),
            cancelLabel: t('Cancel'),
            destructive: true,
        });
        if (!confirmed) {
            return;
        }

        router.post(
            route('admin.review.monitors.force-approve', monitor.id),
            {},
            { preserveScroll: true },
        );
    };

    const reject = async (monitor: PendingMonitor) => {
        const note = await prompt({
            title: t('Reject monitor proposal'),
            description: t('Add an optional note to help the contributor understand what to change.'),
            label: t('Optional rejection note'),
            defaultValue: monitor.review_note ?? '',
            confirmLabel: t('Reject monitor'),
        });
        if (note === null) {
            return;
        }

        router.post(
            route('admin.review.monitors.reject', monitor.id),
            { review_note: note.trim() || null },
            { preserveScroll: true },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {t('Admin Review')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {t('Monitor Moderation Queue')}
                    </h2>
                </div>
            }
        >
            <Head title={t('Monitor Moderation')} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {t('Pending Review')} ({pendingMonitors.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingMonitors.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {t('No pending monitor proposals at the moment.')}
                                </p>
                            ) : (
                                pendingMonitors.map((monitor) => (
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
                                                {monitor.validation_status}
                                            </span>
                                        </div>

                                        <div className="mt-2 space-y-1 text-sm text-white/75">
                                            <p>
                                                <strong className="text-white">{t('Contributor')}:</strong>{' '}
                                                {monitor.creator ? `${monitor.creator.name} (${monitor.creator.email})` : '-'}
                                            </p>
                                            <p>
                                                <strong className="text-white">{t('Product URL')}:</strong>{' '}
                                                {monitor.product_url}
                                            </p>
                                            <p>
                                                <strong className="text-white">{t('Pricing')}:</strong>{' '}
                                                {t('EUR only')}
                                            </p>
                                            <p>
                                                <strong className="text-white">{t('Updated')}:</strong>{' '}
                                                {new Date(monitor.updated_at).toLocaleString(dateLocale)}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => approve(monitor)}
                                                className={cn(
                                                    buttonVariants({ size: 'sm' }),
                                                    'bg-[color:var(--landing-accent)] text-[#0b1201]',
                                                )}
                                            >
                                                {t('Approve')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => forceApprove(monitor)}
                                                className={cn(
                                                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                    'border border-orange-400/40 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20',
                                                )}
                                            >
                                                {t('Force Approve')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => reject(monitor)}
                                                className={cn(
                                                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                    'border border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20',
                                                )}
                                            >
                                                {t('Reject')}
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
