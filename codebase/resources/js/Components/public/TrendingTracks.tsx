import { buttonVariants } from '@/Components/ui/button';
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
    return (
        <section id="trending-tracks" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                        Trending Tracks
                    </p>
                    <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                        Hottest Value Right Now
                    </h2>
                </div>
                <p className="font-body text-sm text-white/60">
                    Ranked by strongest per-can value, freshness, and active data.
                </p>
            </div>

            {tracks.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-6 font-body text-sm text-white/70">
                    No trending tracks yet. Add monitors and run captures to populate this section.
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
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="font-display text-xl font-semibold text-white">
                                        {track.monster.name}
                                        {track.monster.size_label
                                            ? ` (${track.monster.size_label})`
                                            : ''}
                                    </h3>
                                    <p className="font-display text-lg font-bold text-[color:var(--landing-accent)]">
                                        {perCanCents !== null
                                            ? `${formatMoney(perCanCents, track.currency)} / can`
                                            : `${formatMoney(track.effective_total_cents, track.currency)} total`}
                                    </p>
                                </div>

                                <p className="mt-3 font-body text-sm text-white/70">
                                    <strong className="text-white">Store:</strong>{' '}
                                    {track.site ?? 'Unknown'}
                                    {track.domain ? ` (${track.domain})` : ''}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/70">
                                    <strong className="text-white">Pack:</strong>{' '}
                                    {volumeLabel(track.can_count)}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/70">
                                    <strong className="text-white">Total buy:</strong>{' '}
                                    {formatMoney(
                                        track.effective_total_cents,
                                        track.currency,
                                    )}
                                </p>
                                <p className="mt-1 font-body text-sm text-white/60">
                                    Checked {readableCheckedAt(track.checked_at)}
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
                                    View Track
                                </Link>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
