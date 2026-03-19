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
    const { locale, localeTag, t } = useLocale();
    const dateLocale = localeTag;

    return (
        <section id="trending-tracks" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                        {t('Trending Tracks')}
                    </p>
                    <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                        {t('Hottest Value Right Now')}
                    </h2>
                </div>
                <p className="font-body text-sm text-white/60">
                    {t('Ranked by strongest per-can value, freshness, and active data.')}
                </p>
            </div>

            {tracks.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-6 font-body text-sm text-white/70">
                    {t('No trending tracks yet. Add monitors and run captures to populate this section.')}
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
                                            ? `${formatMoney(perCanCents, track.currency)} / ${t('can')}`
                                            : `${formatMoney(track.effective_total_cents, track.currency)} ${t('total')}`}
                                    </p>
                                </div>

                                <p className="mt-3 font-body text-sm text-white/70">
                                    <strong className="text-white">
                                        {t('Store:')}
                                    </strong>{' '}
                                    {track.site ?? t('Unknown')}
                                    {track.domain ? ` (${track.domain})` : ''}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/70">
                                    <strong className="text-white">
                                        {t('Pack:')}
                                    </strong>{' '}
                                    {volumeLabel(
                                        track.can_count,
                                        t('volume unknown'),
                                    )}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/70">
                                    <strong className="text-white">
                                        {t('Total buy:')}
                                    </strong>{' '}
                                    {formatMoney(
                                        track.effective_total_cents,
                                        track.currency,
                                    )}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/60">
                                    {t('Checked')}{' '}
                                    {readableCheckedAt(
                                        track.checked_at,
                                        dateLocale,
                                        t('N/A'),
                                    )}
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    {track.product_url && (
                                        <a
                                            href={track.product_url}
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
                                    <Link
                                        href={track.detail_url}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'outline',
                                                size: 'sm',
                                            }),
                                            'border-white/20 bg-transparent text-white hover:bg-white/10',
                                        )}
                                    >
                                        {t('View Track')}
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
