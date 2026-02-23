import Hero from '@/Components/public/Hero';
import LandingNav from '@/Components/public/LandingNav';
import OfferGrid from '@/Components/public/OfferGrid';
import TrendingTracks from '@/Components/public/TrendingTracks';
import { Card, CardContent } from '@/Components/ui/card';
import { PublicOfferRow, TrendingTrackRow } from '@/lib/publicPricing';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { type CSSProperties, useMemo, useState } from 'react';

type LandingBranding = {
    name: string;
    tagline: string;
    hero_kicker: string;
    hero_title: string;
    hero_subtitle: string;
    primary_cta_label: string;
    secondary_cta_label: string;
    accent_hex: string;
    github_url: string | null;
};

export default function BestPricesIndex({
    auth,
    bestPrices,
    trendingTracks,
    stats,
    branding,
}: PageProps<{
    bestPrices: PublicOfferRow[];
    trendingTracks: TrendingTrackRow[];
    stats: {
        tracked_monsters: number;
        offers: number;
    };
    branding: LandingBranding;
}>) {
    const [query, setQuery] = useState('');
    const normalizedQuery = query.trim().toLowerCase();

    const filteredOffers = useMemo(() => {
        if (normalizedQuery === '') {
            return bestPrices;
        }

        return bestPrices.filter((row) => {
            const haystack = [
                row.monster.name,
                row.monster.size_label ?? '',
                row.site ?? '',
                row.domain ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [bestPrices, normalizedQuery]);

    const rootStyle = {
        '--landing-accent': normalizeHexColor(branding.accent_hex),
        '--landing-accent-soft': hexToRgba(branding.accent_hex, 0.24),
        '--landing-accent-glow': hexToRgba(branding.accent_hex, 0.18),
    } as CSSProperties;

    return (
        <>
            <Head title={branding.name} />

            <div style={rootStyle} className="landing-root min-h-screen bg-[color:var(--landing-bg)] text-white">
                <LandingNav auth={auth} brandName={branding.name} />

                <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                    <Hero branding={branding} stats={stats} />

                    <section className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-6 sm:p-8">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                                    Search Radar
                                </p>
                                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                                    Find Your Favorite Monster
                                </h2>
                            </div>
                            <p className="font-body text-sm text-white/60">
                                {filteredOffers.length} matching offer
                                {filteredOffers.length === 1 ? '' : 's'}
                            </p>
                        </div>

                        <label htmlFor="monster-search" className="sr-only">
                            Search monsters by name, size, or store
                        </label>
                        <input
                            id="monster-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search Monster Ultra, Mango Loco, Amazon, 16oz..."
                            className="h-12 w-full rounded-xl border border-white/15 bg-[color:var(--landing-surface-2)] px-4 font-body text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent-soft)]"
                            aria-label="Search favorite monster"
                        />
                    </section>

                    {normalizedQuery === '' && (
                        <TrendingTracks tracks={trendingTracks} />
                    )}

                    <section id="live-offers" className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                                    Live Offers
                                </p>
                                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                                    Real-Time Monster Deal Board
                                </h2>
                            </div>
                            <p className="font-body text-sm text-white/60">
                                Public snapshots with per-can and pack-level context
                            </p>
                        </div>

                        <OfferGrid offers={filteredOffers} query={query} />
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--landing-accent)]">
                                    Public snapshots
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    Transparent Price Signals
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    Every deal card is backed by stored snapshots so you can verify timing, totals, and pack value.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                                    Open-source transparency
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    Community-Built Tracker
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    Built in public so extraction logic, scoring, and improvements stay visible and auditable.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
                                    Updated on schedule
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    Monitoring First
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    Hourly checks keep offers fresh while preserving historical context for quick market reads.
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    <footer className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] px-6 py-5 sm:px-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 font-body text-sm text-white/70">
                            <p>
                                {branding.name} is an independent Monster deals tracking platform.
                            </p>
                            {branding.github_url ? (
                                <a
                                    href={branding.github_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[color:var(--landing-accent)] underline-offset-4 hover:underline"
                                >
                                    View Open Source Repo
                                </a>
                            ) : (
                                <span className="text-white/50">
                                    Open-source release in progress
                                </span>
                            )}
                        </div>
                    </footer>
                </main>
            </div>
        </>
    );
}

function normalizeHexColor(value: string): string {
    const normalized = value.trim();
    const isHex = /^#(?:[a-fA-F0-9]{3}){1,2}$/.test(normalized);

    return isHex ? normalized : '#9DFF00';
}

function hexToRgba(value: string, alpha: number): string {
    const normalized = normalizeHexColor(value).replace('#', '');
    const expanded =
        normalized.length === 3
            ? normalized
                  .split('')
                  .map((segment) => segment + segment)
                  .join('')
            : normalized;

    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
