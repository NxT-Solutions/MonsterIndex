import Hero from "@/Components/public/Hero";
import LandingNav from "@/Components/public/LandingNav";
import OfferGrid from "@/Components/public/OfferGrid";
import TrendingTracks from "@/Components/public/TrendingTracks";
import { Card, CardContent } from "@/Components/ui/card";
import { useLocale } from "@/lib/locale";
import { PublicOfferRow, TrendingTrackRow } from "@/lib/publicPricing";
import { PageProps } from "@/types";
import { Head, router } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";

type LandingCopy = {
    name: string;
    tagline: string;
    hero_kicker: string;
    hero_title: string;
    hero_subtitle: string;
    primary_cta_label: string;
    secondary_cta_label: string;
    github_url: string;
};

const LANDING_COPY: Record<"en" | "nl", LandingCopy> = {
    en: {
        name: "MonsterIndex",
        tagline: "Track the best Monster offers in one place.",
        hero_kicker: "Live price intelligence",
        hero_title: "Find your next Monster deal before it disappears.",
        hero_subtitle:
            "Search your favorite Monster variants, compare live offers, and spot the strongest pack value in seconds.",
        primary_cta_label: "Browse Deals",
        secondary_cta_label: "View Trending Tracks",
        github_url: "https://github.com/NoahNxT/MonsterIndex",
    },
    nl: {
        name: "MonsterIndex",
        tagline: "Volg de beste Monster aanbiedingen op één plek.",
        hero_kicker: "Live prijsintelligentie",
        hero_title: "Vind je volgende Monster-deal voordat die verdwijnt.",
        hero_subtitle:
            "Zoek je favoriete Monster-variant, vergelijk live aanbiedingen en zie direct de beste packwaarde.",
        primary_cta_label: "Bekijk Deals",
        secondary_cta_label: "Bekijk Trending Tracks",
        github_url: "https://github.com/NoahNxT/MonsterIndex",
    },
};

export default function BestPricesIndex({
    auth,
    bestPrices,
    trendingTracks,
    stats,
}: PageProps<{
    bestPrices: PublicOfferRow[];
    trendingTracks: TrendingTrackRow[];
    stats: {
        tracked_monsters: number;
        offers: number;
    };
}>) {
    const { locale, x } = useLocale();
    const [query, setQuery] = useState("");
    const normalizedQuery = query.trim().toLowerCase();
    const copy = LANDING_COPY[locale as 'en' | 'nl'] ?? LANDING_COPY.en;
    const canonicalUrl = route("home");
    const pageTitle = x(
        "MonsterIndex | Live Monster Energy Deal Tracker",
        "MonsterIndex | Live Monster Energy Deal Tracker",
    );
    const pageDescription = x(
        "Compare live Monster Energy prices, track per-can value, and discover the best current offer across stores.",
        "Vergelijk live Monster Energy prijzen, volg de prijs per blik en ontdek de beste huidige aanbieding over winkels heen.",
    );
    const ogImageUrl = new URL(
        "/brand/monsterindex-og.png",
        canonicalUrl,
    ).toString();

    const filteredOffers = useMemo(() => {
        if (normalizedQuery === "") {
            return bestPrices;
        }

        return bestPrices.filter((row) => {
            const haystack = [
                row.monster.name,
                row.monster.size_label ?? "",
                row.site ?? "",
                row.domain ?? "",
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [bestPrices, normalizedQuery]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (document.visibilityState !== "visible") {
                return;
            }

            router.reload({
                only: ["bestPrices", "trendingTracks", "stats"],
            });
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, []);

    return (
        <>
            <Head title={pageTitle}>
                <meta
                    head-key="description"
                    name="description"
                    content={pageDescription}
                />
                <meta
                    head-key="robots"
                    name="robots"
                    content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
                />
                <link
                    head-key="canonical"
                    rel="canonical"
                    href={canonicalUrl}
                />
                <meta head-key="og:type" property="og:type" content="website" />
                <meta
                    head-key="og:site_name"
                    property="og:site_name"
                    content="MonsterIndex"
                />
                <meta
                    head-key="og:title"
                    property="og:title"
                    content={pageTitle}
                />
                <meta
                    head-key="og:description"
                    property="og:description"
                    content={pageDescription}
                />
                <meta
                    head-key="og:url"
                    property="og:url"
                    content={canonicalUrl}
                />
                <meta
                    head-key="og:image"
                    property="og:image"
                    content={ogImageUrl}
                />
                <meta
                    head-key="twitter:card"
                    name="twitter:card"
                    content="summary_large_image"
                />
                <meta
                    head-key="twitter:title"
                    name="twitter:title"
                    content={pageTitle}
                />
                <meta
                    head-key="twitter:description"
                    name="twitter:description"
                    content={pageDescription}
                />
                <meta
                    head-key="twitter:image"
                    name="twitter:image"
                    content={ogImageUrl}
                />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "CollectionPage",
                        name: pageTitle,
                        description: pageDescription,
                        url: canonicalUrl,
                    })}
                </script>
            </Head>

            <div className="landing-root min-h-screen bg-[color:var(--landing-bg)] text-white">
                <LandingNav auth={auth} brandName={copy.name} />

                <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                    <Hero copy={copy} stats={stats} />

                    <section className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-6 sm:p-8">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                                    {x("Search Radar", "Zoek Radar")}
                                </p>
                                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                                    {x(
                                        "Find Your Favorite Monster",
                                        "Zoek Je Favoriete Monster",
                                    )}
                                </h2>
                            </div>
                            <p className="w-full font-body text-sm text-white/60 sm:w-auto sm:text-right">
                                {filteredOffers.length}{" "}
                                {x("matching offer", "passende aanbieding")}
                                {filteredOffers.length === 1
                                    ? ""
                                    : x("s", "en")}
                            </p>
                        </div>

                        <label htmlFor="monster-search" className="sr-only">
                            {x(
                                "Search monsters by name, size, or store",
                                "Zoek monsters op naam, formaat of winkel",
                            )}
                        </label>
                        <input
                            id="monster-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={x(
                                "Search Monster Ultra, Mango Loco, Amazon, 500ml...",
                                "Zoek Monster Ultra, Mango Loco, Amazon, 500ml...",
                            )}
                            className="h-12 w-full rounded-xl border border-white/15 bg-[color:var(--landing-surface-2)] px-4 font-body text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent-soft)]"
                            aria-label={x(
                                "Search favorite monster",
                                "Zoek favoriete monster",
                            )}
                        />
                    </section>

                    {normalizedQuery === "" && (
                        <TrendingTracks tracks={trendingTracks} />
                    )}

                    <section id="live-offers" className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                                    {x("Live Offers", "Live Aanbiedingen")}
                                </p>
                                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                                    {x(
                                        "Real-Time Monster Deal Board",
                                        "Realtime Monster Deal Board",
                                    )}
                                </h2>
                            </div>
                            <p className="w-full font-body text-sm text-white/60 sm:w-auto sm:text-right">
                                {x(
                                    "Public snapshots with per-can and pack-level context",
                                    "Publieke snapshots met prijs per blik en pack-context",
                                )}
                            </p>
                        </div>

                        <OfferGrid offers={filteredOffers} query={query} />
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--landing-accent)]">
                                    {x(
                                        "Public snapshots",
                                        "Publieke snapshots",
                                    )}
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    {x(
                                        "Transparent Price Signals",
                                        "Transparante Prijssignalen",
                                    )}
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    {x(
                                        "Every deal card is backed by stored snapshots so you can verify timing, totals, and pack value.",
                                        "Elke dealkaart is gebaseerd op opgeslagen snapshots zodat je timing, totalen en packwaarde kunt controleren.",
                                    )}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                                    {x(
                                        "Open-source transparency",
                                        "Open-source transparantie",
                                    )}
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    {x(
                                        "Community-Built Tracker",
                                        "Tracker Gebouwd Door De Community",
                                    )}
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    {x(
                                        "Built in public so extraction logic, scoring, and improvements stay visible and auditable.",
                                        "Publiek gebouwd zodat extractielogica, scoring en verbeteringen zichtbaar en controleerbaar blijven.",
                                    )}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
                                    {x(
                                        "Updated on schedule",
                                        "Geüpdatet op schema",
                                    )}
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    {x("Monitoring First", "Monitoring Eerst")}
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    {x(
                                        "Hourly checks keep offers fresh while preserving historical context for quick market reads.",
                                        "Uurlijkse checks houden aanbiedingen vers en bewaren historische context voor snelle marktinzichten.",
                                    )}
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    <footer className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] px-6 py-5 sm:px-8">
                        <div className="flex flex-col gap-3 font-body text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                {x(
                                    "MonsterIndex is an independent Monster deals tracking platform.",
                                    "MonsterIndex is een onafhankelijk platform voor het volgen van Monster-deals.",
                                )}
                            </p>
                            <a
                                href={copy.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[color:var(--landing-accent)] underline-offset-4 hover:underline"
                            >
                                {x(
                                    "View Open Source Repo",
                                    "Bekijk Open Source Repo",
                                )}
                            </a>
                        </div>
                    </footer>
                </main>
            </div>
        </>
    );
}
