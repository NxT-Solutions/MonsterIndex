import { useAppDialogs } from '@/Components/providers/AppDialogProvider';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';

type PendingSuggestion = {
    id: number;
    name: string;
    size_label: string | null;
    notes: string | null;
    created_at: string;
    user: {
        id: number;
        name: string;
        email: string;
    } | null;
};

export default function SuggestionReviewIndex({
    pendingSuggestions,
}: {
    pendingSuggestions: PendingSuggestion[];
}) {
    const { locale, x } = useLocale();
    const { prompt } = useAppDialogs();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    const approve = async (suggestion: PendingSuggestion) => {
        const reviewNote = await prompt({
            title: x(
                'Approve and create monster',
                'Goedkeuren en monster maken',
            ),
            description: x(
                'Optionally leave a note explaining the approval or any follow-up.',
                'Laat eventueel een notitie achter met uitleg over de goedkeuring of eventuele opvolging.',
            ),
            label: x('Optional approval note', 'Optionele goedkeuringsnotitie'),
            confirmLabel: x(
                'Approve suggestion',
                'Suggestie goedkeuren',
            ),
        });
        if (reviewNote === null) {
            return;
        }

        router.post(
            route('admin.review.suggestions.approve', suggestion.id),
            {
                review_note: reviewNote.trim() || null,
            },
            { preserveScroll: true },
        );
    };

    const reject = async (suggestion: PendingSuggestion) => {
        const reviewNote = await prompt({
            title: x('Reject suggestion', 'Suggestie afwijzen'),
            description: x(
                'Optionally explain why this suggestion is being rejected.',
                'Leg optioneel uit waarom deze suggestie wordt afgewezen.',
            ),
            label: x('Optional rejection note', 'Optionele afwijsnotitie'),
            confirmLabel: x('Reject suggestion', 'Suggestie afwijzen'),
        });
        if (reviewNote === null) {
            return;
        }

        router.post(
            route('admin.review.suggestions.reject', suggestion.id),
            {
                review_note: reviewNote.trim() || null,
            },
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
                        {x('Monster Suggestion Queue', 'Monstersuggestie Wachtrij')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Suggestion Moderation', 'Suggestie Moderatie')} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Pending Suggestions', 'Wachtende Suggesties')} ({pendingSuggestions.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingSuggestions.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {x(
                                        'No pending suggestions right now.',
                                        'Momenteel geen wachtende suggesties.',
                                    )}
                                </p>
                            ) : (
                                pendingSuggestions.map((suggestion) => (
                                    <div
                                        key={suggestion.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-display text-base text-white">
                                                    {suggestion.name}
                                                    {suggestion.size_label ? ` (${suggestion.size_label})` : ''}
                                                </p>
                                                <p className="text-xs text-white/60">
                                                    {suggestion.user
                                                        ? `${suggestion.user.name} (${suggestion.user.email})`
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-2 space-y-1 text-sm text-white/75">
                                            {suggestion.notes && (
                                                <p>
                                                    <strong className="text-white">{x('Notes', 'Notities')}:</strong>{' '}
                                                    {suggestion.notes}
                                                </p>
                                            )}
                                            <p>
                                                <strong className="text-white">{x('Submitted', 'Ingediend')}:</strong>{' '}
                                                {new Date(suggestion.created_at).toLocaleString(dateLocale)}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => approve(suggestion)}
                                                className={cn(
                                                    buttonVariants({ size: 'sm' }),
                                                    'bg-[color:var(--landing-accent)] text-[#0b1201]',
                                                )}
                                            >
                                                {x('Approve + Create Monster', 'Goedkeuren + Monster Maken')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => reject(suggestion)}
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
