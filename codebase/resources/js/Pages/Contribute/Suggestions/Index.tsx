import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

type SuggestionRow = {
    id: number;
    name: string;
    size_label: string | null;
    notes: string | null;
    status: string;
    review_note: string | null;
    reviewed_at: string | null;
    created_at: string;
    reviewer?: {
        id: number;
        name: string;
    } | null;
    monster?: {
        id: number;
        name: string;
        slug: string;
    } | null;
};

export default function SuggestionIndex({ suggestions }: { suggestions: SuggestionRow[] }) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    const form = useForm({
        name: '',
        size_label: '',
        notes: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('contribute.suggestions.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
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
                        {x('Monster Suggestions', 'Monstersuggesties')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Monster Suggestions', 'Monstersuggesties')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Suggest New Monster', 'Nieuw Monster Voorstellen')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form className="grid gap-3 md:grid-cols-12" onSubmit={submit}>
                                <div className="md:col-span-5">
                                    <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                        {x('Name', 'Naam')}
                                    </label>
                                    <input
                                        className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                        value={form.data.name}
                                        onChange={(event) => form.setData('name', event.target.value)}
                                        placeholder="Monster Ultra Peachy Keen 16oz"
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                        {x('Size Label (Optional)', 'Maatlabel (optioneel)')}
                                    </label>
                                    <input
                                        className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                        value={form.data.size_label}
                                        onChange={(event) => form.setData('size_label', event.target.value)}
                                        placeholder="16oz"
                                    />
                                </div>

                                <div className="md:col-span-4">
                                    <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                        {x('Notes (Optional)', 'Notities (optioneel)')}
                                    </label>
                                    <input
                                        className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                        value={form.data.notes}
                                        onChange={(event) => form.setData('notes', event.target.value)}
                                        placeholder={x('Why this should be tracked', 'Waarom dit gevolgd moet worden')}
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <button
                                        type="submit"
                                        className={cn(
                                            buttonVariants({ size: 'sm' }),
                                            'w-full bg-[color:var(--landing-accent)] text-[#0b1201] md:mt-6',
                                        )}
                                        disabled={form.processing}
                                    >
                                        {x('Submit Suggestion', 'Suggestie Indienen')}
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('My Suggestions', 'Mijn Suggesties')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {suggestions.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {x('No suggestions yet.', 'Nog geen suggesties.')}
                                </p>
                            ) : (
                                suggestions.map((suggestion) => (
                                    <div
                                        key={suggestion.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-display text-base text-white">
                                                {suggestion.name}
                                                {suggestion.size_label ? ` (${suggestion.size_label})` : ''}
                                            </p>
                                            <span className="rounded-full border border-white/20 px-2 py-1 text-xs uppercase tracking-[0.08em] text-white/80">
                                                {suggestion.status}
                                            </span>
                                        </div>

                                        <div className="mt-2 space-y-1 text-sm text-white/75">
                                            {suggestion.notes && (
                                                <p>
                                                    <strong className="text-white">{x('Notes', 'Notities')}:</strong>{' '}
                                                    {suggestion.notes}
                                                </p>
                                            )}
                                            {suggestion.review_note && (
                                                <p>
                                                    <strong className="text-white">{x('Review note', 'Reviewnotitie')}:</strong>{' '}
                                                    {suggestion.review_note}
                                                </p>
                                            )}
                                            <p>
                                                <strong className="text-white">{x('Created', 'Aangemaakt')}:</strong>{' '}
                                                {new Date(suggestion.created_at).toLocaleString(dateLocale)}
                                            </p>
                                            {suggestion.reviewed_at && (
                                                <p>
                                                    <strong className="text-white">{x('Reviewed', 'Beoordeeld')}:</strong>{' '}
                                                    {new Date(suggestion.reviewed_at).toLocaleString(dateLocale)}
                                                </p>
                                            )}
                                            {suggestion.monster && (
                                                <p>
                                                    <strong className="text-white">{x('Created monster', 'Aangemaakt monster')}:</strong>{' '}
                                                    {suggestion.monster.name}
                                                </p>
                                            )}
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
