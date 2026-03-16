import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';

type FollowRow = {
    id: number;
    currency: string;
    last_alerted_at: string | null;
    created_at: string | null;
    monster: {
        id: number;
        name: string;
        slug: string;
        size_label: string | null;
    };
    best_offer: {
        effective_total_cents: number;
        currency: string;
        can_count: number;
        price_per_can_cents: number;
        assumed_single_can: boolean;
        checked_at: string | null;
        site: string | null;
        domain: string | null;
    } | null;
};

export default function FollowedMonstersIndex({
    follows,
}: {
    follows: FollowRow[];
}) {
    const { localeTag, t } = useLocale();
    const dateLocale = localeTag;

    const withBestOffer = follows.filter((follow) => follow.best_offer !== null).length;
    const withRecentAlert = follows.filter((follow) => follow.last_alerted_at !== null).length;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {t('Community')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {t('Following')}
                    </h2>
                </div>
            }
        >
            <Head title={t('Followed Monsters')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <KpiCard
                            label={t('Followed Monsters')}
                            value={follows.length}
                            accent="lime"
                        />
                        <KpiCard
                            label={t('With Best Offer')}
                            value={withBestOffer}
                            accent="cyan"
                        />
                        <KpiCard
                            label={t('Alerted At Least Once')}
                            value={withRecentAlert}
                            accent="orange"
                        />
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {t('Follow List')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {follows.length === 0 ? (
                                <p className="text-sm text-white/70">
                                    {t('You are not following any monsters yet. Open the public board and tap Follow.')}
                                </p>
                            ) : (
                                follows.map((follow) => (
                                    <article
                                        key={follow.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-medium text-white">
                                                    {follow.monster.name}
                                                    {follow.monster.size_label
                                                        ? ` (${follow.monster.size_label})`
                                                        : ''}
                                                </h3>
                                                <p className="text-xs text-white/60">
                                                    {t('Currency')}: {follow.currency}
                                                </p>
                                            </div>
                                            <span className="text-xs text-white/55">
                                                {follow.created_at
                                                    ? `${t('Followed')}: ${new Date(follow.created_at).toLocaleString(dateLocale)}`
                                                    : ''}
                                            </span>
                                        </div>

                                        <div className="mt-2 text-sm text-white/75">
                                            {follow.best_offer ? (
                                                <>
                                                    <p>
                                                        {t('Price per can')}:{' '}
                                                        {follow.best_offer.currency}{' '}
                                                        {(follow.best_offer.price_per_can_cents / 100).toFixed(2)}{' '}
                                                        ({follow.best_offer.can_count}-{t('pack')})
                                                        {follow.best_offer.assumed_single_can
                                                            ? `, ${t('assumed')}`
                                                            : ''}
                                                    </p>
                                                    <p className="mt-1 text-xs text-white/65">
                                                        {t('Total buy')}:{' '}
                                                        {follow.best_offer.currency}{' '}
                                                        {(follow.best_offer.effective_total_cents / 100).toFixed(2)}{' '}
                                                        ({follow.best_offer.site ?? t('Unknown')})
                                                    </p>
                                                </>
                                            ) : (
                                                <p>{t('No best offer yet.')}</p>
                                            )}
                                            <p className="mt-1 text-xs text-white/60">
                                                {t('Last alert')}:{' '}
                                                {follow.last_alerted_at
                                                    ? new Date(follow.last_alerted_at).toLocaleString(dateLocale)
                                                    : t('Never')}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Link
                                                href={route('monsters.show', follow.monster.slug)}
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'outline',
                                                        size: 'sm',
                                                    }),
                                                    'border-white/20 bg-transparent text-white hover:bg-white/10',
                                                )}
                                            >
                                                {t('Open Monster')}
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.delete(
                                                        route(
                                                            'monsters.follow.destroy',
                                                            follow.monster.slug,
                                                        ),
                                                        {
                                                            data: { currency: follow.currency },
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'secondary',
                                                        size: 'sm',
                                                    }),
                                                    'border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20',
                                                )}
                                            >
                                                {t('Unfollow')}
                                            </button>
                                        </div>
                                    </article>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
