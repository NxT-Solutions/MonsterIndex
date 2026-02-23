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
import { Link } from '@inertiajs/react';

type OfferGridProps = {
    offers: PublicOfferRow[];
    query: string;
};

export default function OfferGrid({ offers, query }: OfferGridProps) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    if (offers.length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-8 text-center font-body text-sm text-white/70">
                {query.trim() === ''
                    ? x(
                          'No live offers yet. Admins can add records and run monitor checks.',
                          'Nog geen live aanbiedingen. Admins kunnen records toevoegen en monitorchecks uitvoeren.',
                      )
                    : x(
                          'No offers match your search yet. Try another monster name or store.',
                          'Geen aanbiedingen gevonden voor je zoekopdracht. Probeer een andere monsternaam of winkel.',
                      )}
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
                                    <strong className="text-white">
                                        {x('Store:', 'Winkel:')}
                                    </strong>{' '}
                                    {offer.site ?? x('Unknown', 'Onbekend')}
                                    {offer.domain ? ` (${offer.domain})` : ''}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-display text-2xl font-bold text-[color:var(--landing-accent)]">
                                    {perCan !== null
                                        ? `${formatMoney(perCan, offer.currency)} / ${x('can', 'blik')}`
                                        : `${formatMoney(offer.effective_total_cents, offer.currency)} ${x('total', 'totaal')}`}
                                </p>
                                <p className="font-body text-xs text-white/60">
                                    {volumeLabel(
                                        offer.can_count,
                                        x('volume unknown', 'volume onbekend'),
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2 font-body text-sm text-white/75 sm:grid-cols-2 lg:grid-cols-4">
                            <p>
                                <strong className="text-white">
                                    {x('Base Price:', 'Basisprijs:')}
                                </strong>{' '}
                                {offer.price_cents !== null
                                    ? formatMoney(offer.price_cents, offer.currency)
                                    : x('Unknown', 'Onbekend')}
                            </p>
                            <p>
                                <strong className="text-white">
                                    {x('Shipping:', 'Verzending:')}
                                </strong>{' '}
                                {offer.shipping_cents !== null
                                    ? formatMoney(
                                          offer.shipping_cents,
                                          offer.currency,
                                      )
                                    : x('Unknown', 'Onbekend')}
                            </p>
                            <p>
                                <strong className="text-white">
                                    {x('Total Buy:', 'Totale Aankoop:')}
                                </strong>{' '}
                                {formatMoney(
                                    offer.effective_total_cents,
                                    offer.currency,
                                )}
                            </p>
                            <p>
                                <strong className="text-white">
                                    {x('Checked:', 'Gecheckt:')}
                                </strong>{' '}
                                {readableCheckedAt(
                                    offer.checked_at,
                                    dateLocale,
                                    x('N/A', 'N/B'),
                                )}
                            </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="font-body text-xs uppercase tracking-[0.18em] text-white/45">
                                {x('status', 'status')}: {offer.status ?? x('unknown', 'onbekend')}
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
                                {x('View History', 'Bekijk Historiek')}
                            </Link>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
