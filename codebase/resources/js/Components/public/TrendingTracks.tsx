import { buttonVariants } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import {
    effectivePerCanCents,
    formatMoney,
    readableCheckedAt,
    TrendingTrackRow,
    volumeLabel,
} from '@/lib/publicPricing';
import { Link } from '@inertiajs/react';

type TrendingTracksProps = {
    tracks: TrendingTrackRow[];
};

export default function TrendingTracks({ tracks }: TrendingTracksProps) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

    return (
        <section id="trending-tracks" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                        {x('Trending Tracks', 'Trending Tracks')}
                    </p>
                    <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                        {x('Hottest Value Right Now', 'Beste Waarde Van Nu')}
                    </h2>
                </div>
                <p className="font-body text-sm text-white/60">
                    {x(
                        'Ranked by strongest per-can value, freshness, and active data.',
                        'Gerangschikt op beste prijs per blik, versheid en actieve data.',
                    )}
                </p>
            </div>

            {tracks.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-6 font-body text-sm text-white/70">
                    {x(
                        'No trending tracks yet. Add monitors and run captures to populate this section.',
                        'Nog geen trending tracks. Voeg records toe en voer scrapes uit om deze sectie te vullen.',
                    )}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {tracks.map((track) => {
                        const perCanCents = effectivePerCanCents(track);

                        return (
                            <article
                                key={track.id}
                                className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-5 shadow-[0_16px_45px_rgba(0,0,0,.35)]"
                            >
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                    <h3 className="font-display text-lg font-semibold text-white sm:text-xl">
                                        {track.monster.name}
                                        {track.monster.size_label
                                            ? ` (${track.monster.size_label})`
                                            : ''}
                                    </h3>
                                    <p className="font-display text-base font-bold text-[color:var(--landing-accent)] sm:text-lg sm:text-right">
                                        {perCanCents !== null
                                            ? `${formatMoney(perCanCents, track.currency)} / ${x('can', 'blik')}`
                                            : `${formatMoney(track.effective_total_cents, track.currency)} ${x('total', 'totaal')}`}
                                    </p>
                                </div>

                                <p className="mt-3 font-body text-sm text-white/70">
                                    <strong className="text-white">
                                        {x('Store:', 'Winkel:')}
                                    </strong>{' '}
                                    {track.site ?? x('Unknown', 'Onbekend')}
                                    {track.domain ? ` (${track.domain})` : ''}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/70">
                                    <strong className="text-white">
                                        {x('Pack:', 'Pack:')}
                                    </strong>{' '}
                                    {volumeLabel(
                                        track.can_count,
                                        x('volume unknown', 'volume onbekend'),
                                    )}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/70">
                                    <strong className="text-white">
                                        {x('Total buy:', 'Totale aankoop:')}
                                    </strong>{' '}
                                    {formatMoney(
                                        track.effective_total_cents,
                                        track.currency,
                                    )}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/60">
                                    {x('Checked', 'Gecheckt')}{' '}
                                    {readableCheckedAt(
                                        track.checked_at,
                                        dateLocale,
                                        x('N/A', 'N/B'),
                                    )}
                                </p>

                                <Link
                                    href={track.detail_url}
                                    className={cn(
                                        buttonVariants({
                                            variant: 'outline',
                                            size: 'sm',
                                        }),
                                        'mt-4 border-white/20 bg-transparent text-white hover:bg-white/10',
                                    )}
                                >
                                    {x('View Track', 'Bekijk Track')}
                                </Link>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
