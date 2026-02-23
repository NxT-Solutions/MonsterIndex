import { buttonVariants } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import {
    effectivePerCanCents,
    formatMoney,
    PublicOfferRow,
    readableCheckedAt,
    volumeLabel,
} from '@/lib/publicPricing';
import { Link } from '@inertiajs/react';

type OfferGridProps = {
    offers: PublicOfferRow[];
    query: string;
};

export default function OfferGrid({ offers, query }: OfferGridProps) {
    if (offers.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-8 text-center font-body text-sm text-white/70">
                {query.trim() === ''
                    ? 'No live offers yet. Admins can add records and run monitor checks.'
                    : 'No offers match your search yet. Try another monster name or store.'}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {offers.map((offer) => {
                const perCan = effectivePerCanCents(offer);

                return (
                    <article
                        key={offer.id}
                        className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-6 shadow-[0_12px_35px_rgba(0,0,0,.28)]"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h3 className="font-display text-2xl font-semibold text-white">
                                    {offer.monster.name}
                                    {offer.monster.size_label
                                        ? ` (${offer.monster.size_label})`
                                        : ''}
                                </h3>
                                <p className="mt-2 font-body text-sm text-white/70">
                                    <strong className="text-white">Store:</strong>{' '}
                                    {offer.site ?? 'Unknown'}
                                    {offer.domain ? ` (${offer.domain})` : ''}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-display text-2xl font-bold text-[color:var(--landing-accent)]">
                                    {perCan !== null
                                        ? `${formatMoney(perCan, offer.currency)} / can`
                                        : `${formatMoney(offer.effective_total_cents, offer.currency)} total`}
                                </p>
                                <p className="font-body text-xs text-white/60">
                                    {volumeLabel(offer.can_count)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2 font-body text-sm text-white/75 sm:grid-cols-2 lg:grid-cols-4">
                            <p>
                                <strong className="text-white">Base Price:</strong>{' '}
                                {offer.price_cents !== null
                                    ? formatMoney(offer.price_cents, offer.currency)
                                    : 'Unknown'}
                            </p>
                            <p>
                                <strong className="text-white">Shipping:</strong>{' '}
                                {offer.shipping_cents !== null
                                    ? formatMoney(
                                          offer.shipping_cents,
                                          offer.currency,
                                      )
                                    : 'Unknown'}
                            </p>
                            <p>
                                <strong className="text-white">Total Buy:</strong>{' '}
                                {formatMoney(
                                    offer.effective_total_cents,
                                    offer.currency,
                                )}
                            </p>
                            <p>
                                <strong className="text-white">Checked:</strong>{' '}
                                {readableCheckedAt(offer.checked_at)}
                            </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="font-body text-xs uppercase tracking-[0.18em] text-white/45">
                                status: {offer.status ?? 'unknown'}
                            </p>
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
                                View History
                            </Link>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
