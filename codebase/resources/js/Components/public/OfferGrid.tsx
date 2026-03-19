import { buttonVariants } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import {
    effectivePerCanCents,
    formatMoney,
    PublicOfferRow,
    readableCheckedAt,
    volumeLabel,
} from '@/lib/publicPricing';
import { PageProps } from '@/types';
import axios from 'axios';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type OfferGridProps = {
    offers: PublicOfferRow[];
    query: string;
};

export default function OfferGrid({ offers, query }: OfferGridProps) {
    const { locale, localeTag, t } = useLocale();
    const dateLocale = localeTag;
    const page = usePage<PageProps>();
    const user = page.props.auth.user;
    const canFollow = Boolean(user?.can.monster_follow);
    const [loadingFollowKey, setLoadingFollowKey] = useState<string | null>(null);

    const initialFollowState = useMemo<Record<string, boolean>>(() => {
        return offers.reduce<Record<string, boolean>>((carry, offer) => {
            carry[followKey(offer)] = offer.is_following ?? false;

            return carry;
        }, {});
    }, [offers]);

    const [followState, setFollowState] = useState<Record<string, boolean>>(initialFollowState);
    useEffect(() => {
        setFollowState(initialFollowState);
    }, [initialFollowState]);

    if (offers.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-8 text-center font-body text-sm text-white/70">
                {query.trim() === ''
                    ? t('No live offers yet. Admins can add records and run monitor checks.')
                    : t('No offers match your search yet. Try another monster name or store.')}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {offers.map((offer) => {
                const perCan = effectivePerCanCents(offer);
                const key = followKey(offer);
                const isFollowing = followState[key] ?? offer.is_following ?? false;
                const followLoading = loadingFollowKey === key;

                return (
                    <article
                        key={offer.id}
                        className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-4 shadow-[0_12px_35px_rgba(0,0,0,.28)] sm:p-6"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">
                                    {offer.monster.name}
                                    {offer.monster.size_label
                                        ? ` (${offer.monster.size_label})`
                                        : ''}
                                </h3>
                                <p className="mt-2 font-body text-sm text-white/70">
                                    <strong className="text-white">
                                        {t('Store:')}
                                    </strong>{' '}
                                    {offer.site ?? t('Unknown')}
                                    {offer.domain ? ` (${offer.domain})` : ''}
                                </p>
                            </div>
                            <div className="sm:text-right">
                                <p className="font-display text-xl font-bold text-[color:var(--landing-accent)] sm:text-2xl">
                                    {perCan !== null
                                        ? `${formatMoney(perCan, offer.currency)} / ${t('can')}`
                                        : `${formatMoney(offer.effective_total_cents, offer.currency)} ${t('total')}`}
                                </p>
                                <p className="font-body text-xs text-white/60">
                                    {volumeLabel(
                                        offer.can_count,
                                        t('volume unknown'),
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2 font-body text-sm text-white/75 sm:grid-cols-2 lg:grid-cols-4">
                            <p>
                                <strong className="text-white">
                                    {t('Base Price:')}
                                </strong>{' '}
                                {offer.price_cents !== null
                                    ? formatMoney(offer.price_cents, offer.currency)
                                    : t('Unknown')}
                            </p>
                            <p>
                                <strong className="text-white">
                                    {t('Shipping:')}
                                </strong>{' '}
                                {offer.shipping_cents !== null
                                    ? formatMoney(
                                          offer.shipping_cents,
                                          offer.currency,
                                      )
                                    : t('Unknown')}
                            </p>
                            <p>
                                <strong className="text-white">
                                    {t('Total Buy:')}
                                </strong>{' '}
                                {formatMoney(
                                    offer.effective_total_cents,
                                    offer.currency,
                                )}
                            </p>
                            <p>
                                <strong className="text-white">
                                    {t('Checked:')}
                                </strong>{' '}
                                {readableCheckedAt(
                                    offer.checked_at,
                                    dateLocale,
                                    t('N/A'),
                                )}
                            </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-body text-xs uppercase tracking-[0.18em] text-white/45">
                                {t('status')}: {offer.status ?? t('unknown')}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {offer.product_url && (
                                    <a
                                        href={offer.product_url}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className={cn(
                                            buttonVariants({
                                                variant: 'default',
                                                size: 'sm',
                                            }),
                                            'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                        )}
                                    >
                                        {t('Open Cheapest Deal')}
                                    </a>
                                )}
                                {user && canFollow ? (
                                    <button
                                        type="button"
                                        disabled={followLoading}
                                        onClick={async () => {
                                            setLoadingFollowKey(key);
                                            try {
                                                if (isFollowing) {
                                                    await axios.delete(
                                                        route('monsters.follow.destroy', offer.monster.slug),
                                                        {
                                                            data: { currency: 'EUR' },
                                                            headers: { Accept: 'application/json' },
                                                        },
                                                    );
                                                } else {
                                                    await axios.post(
                                                        route('monsters.follow.store', offer.monster.slug),
                                                        { currency: 'EUR' },
                                                        { headers: { Accept: 'application/json' } },
                                                    );
                                                }

                                                setFollowState((currentState) => ({
                                                    ...currentState,
                                                    [key]: !isFollowing,
                                                }));
                                            } catch {
                                                toast.error(
                                                    t('Could not update follow status right now.'),
                                                );
                                            } finally {
                                                setLoadingFollowKey(null);
                                            }
                                        }}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'outline',
                                                size: 'sm',
                                            }),
                                            isFollowing
                                                ? 'border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95'
                                                : 'border-white/20 bg-transparent text-white hover:bg-white/10',
                                        )}
                                    >
                                        {followLoading
                                            ? t('Saving...')
                                            : isFollowing
                                              ? t('Following')
                                              : t('Follow')}
                                    </button>
                                ) : (
                                    <Link
                                        href={route('login')}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'outline',
                                                size: 'sm',
                                            }),
                                            'border-white/20 bg-transparent text-white hover:bg-white/10',
                                        )}
                                    >
                                        {t('Sign in to follow')}
                                    </Link>
                                )}
                                <Link
                                    href={offer.detail_url}
                                    className={cn(
                                        buttonVariants({
                                            variant: 'outline',
                                            size: 'sm',
                                        }),
                                        'border-white/20 bg-transparent text-white hover:bg-white/10',
                                    )}
                                >
                                    {t('View History')}
                                </Link>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function followKey(offer: PublicOfferRow): string {
    return `${offer.monster.id}:EUR`;
}
