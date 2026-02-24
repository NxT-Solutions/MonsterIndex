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
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    const approve = (monitor: PendingMonitor) => {
        router.post(route('admin.review.monitors.approve', monitor.id), {}, { preserveScroll: true });
    };

    const forceApprove = (monitor: PendingMonitor) => {
        const confirmed = window.confirm(
            x(
                'Force-approve this monitor even though validation failed?',
                'Deze monitor force-goedkeuren ook al is validatie mislukt?',
            ),
        );
        if (!confirmed) {
            return;
        }

        router.post(
            route('admin.review.monitors.force-approve', monitor.id),
            {},
            { preserveScroll: true },
        );
    };

    const reject = (monitor: PendingMonitor) => {
        const note = window.prompt(
            x('Optional rejection note', 'Optionele afwijsnotitie'),
            monitor.review_note ?? '',
        );
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
                        {x('Admin Review', 'Admin Review')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Monitor Moderation Queue', 'Monitor Moderatiewachtrij')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Monitor Moderation', 'Monitor Moderatie')} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Pending Review', 'Wacht op Review')} ({pendingMonitors.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingMonitors.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {x(
                                        'No pending monitor proposals at the moment.',
                                        'Momenteel geen monitorvoorstellen in behandeling.',
                                    )}
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
                                                <strong className="text-white">{x('Contributor', 'Bijdrager')}:</strong>{' '}
                                                {monitor.creator ? `${monitor.creator.name} (${monitor.creator.email})` : '-'}
                                            </p>
                                            <p>
                                                <strong className="text-white">{x('Product URL', 'Product-URL')}:</strong>{' '}
                                                {monitor.product_url}
                                            </p>
                                            <p>
                                                <strong className="text-white">{x('Currency', 'Valuta')}:</strong>{' '}
                                                {monitor.currency}
                                            </p>
                                            <p>
                                                <strong className="text-white">{x('Updated', 'Bijgewerkt')}:</strong>{' '}
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
                                                {x('Approve', 'Goedkeuren')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => forceApprove(monitor)}
                                                className={cn(
                                                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                    'border border-orange-400/40 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20',
                                                )}
                                            >
                                                {x('Force Approve', 'Force Goedkeuren')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => reject(monitor)}
                                                className={cn(
                                                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                                                    'border border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20',
                                                )}
                                            >
                                                {x('Reject', 'Afwijzen')}
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
