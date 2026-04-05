import DeployVersionStrip from "@/Components/DeployVersionStrip";
import Hero from "@/Components/public/Hero";
import LandingNav from "@/Components/public/LandingNav";
import { Card, CardContent } from "@/Components/ui/card";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { useLocale } from "@/lib/locale";
import { PublicOfferRow, TrendingTrackRow } from "@/lib/publicPricing";
import { PageProps } from "@/types";
import { Head, router } from "@inertiajs/react";
import {
    type ReactNode,
    Suspense,
    lazy,
    startTransition,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

const OfferGrid = lazy(() => import("@/Components/public/OfferGrid"));
const TrendingTracks = lazy(() => import("@/Components/public/TrendingTracks"));

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
    const { locale, t } = useLocale();
    const [query, setQuery] = useState("");
    const lastTrackedSearchRef = useRef<string | null>(null);
    const normalizedQuery = query.trim().toLowerCase();
    const copy = LANDING_COPY[locale as 'en' | 'nl'] ?? LANDING_COPY.en;
    const canonicalUrl = route("home");
    const pageTitle = t("MonsterIndex | Live Monster Energy Deal Tracker");
    const pageDescription = t("Compare live Monster Energy prices, track per-can value, and discover the best current offer across stores.");
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

    useEffect(() => {
        if (normalizedQuery.length < 2) {
            if (normalizedQuery === "") {
                lastTrackedSearchRef.current = null;
            }

            return;
        }

        const timeoutId = window.setTimeout(() => {
            if (lastTrackedSearchRef.current === normalizedQuery) {
                return;
            }

            lastTrackedSearchRef.current = normalizedQuery;

            void trackAnalyticsEvent({
                eventName: "search",
                label: normalizedQuery,
                properties: {
                    results_count: filteredOffers.length,
                },
            });
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [filteredOffers.length, normalizedQuery]);

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
                                    {t("Search Radar")}
                                </p>
                                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                                    {t("Find Your Favorite Monster")}
                                </h2>
                            </div>
                            <p className="w-full font-body text-sm text-white/60 sm:w-auto sm:text-right">
                                {filteredOffers.length}{" "}
                                {t("matching offer")}
                                {filteredOffers.length === 1
                                    ? ""
                                    : t("s")}
                            </p>
                        </div>

                        <label htmlFor="monster-search" className="sr-only">
                            {t("Search monsters by name, size, or store")}
                        </label>
                        <input
                            id="monster-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t("Search Monster Ultra, Mango Loco, Amazon, 500ml...")}
                            className="h-12 w-full rounded-xl border border-white/15 bg-[color:var(--landing-surface-2)] px-4 font-body text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent-soft)]"
                            aria-label={t("Search favorite monster")}
                        />
                    </section>

                    {normalizedQuery === "" && (
                        <DeferredSection fallback={<TrendingTracksSkeleton />}>
                            <TrendingTracks tracks={trendingTracks} />
                        </DeferredSection>
                    )}

                    <section id="live-offers" className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                                    {t("Live Offers")}
                                </p>
                                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                                    {t("Real-Time Monster Deal Board")}
                                </h2>
                            </div>
                            <p className="w-full font-body text-sm text-white/60 sm:w-auto sm:text-right">
                                {t("Public snapshots with per-can and pack-level context")}
                            </p>
                        </div>

                        <DeferredSection fallback={<OfferGridSkeleton />}>
                            <OfferGrid offers={filteredOffers} query={query} />
                        </DeferredSection>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--landing-accent)]">
                                    {t("Public snapshots")}
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    {t("Transparent Price Signals")}
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    {t("Every deal card is backed by stored snapshots so you can verify timing, totals, and pack value.")}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                                    {t("Open-source transparency")}
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    {t("Community-Built Tracker")}
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    {t("Built in public so extraction logic, scoring, and improvements stay visible and auditable.")}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)] shadow-[0_14px_40px_rgba(0,0,0,.3)]">
                            <CardContent className="space-y-2 p-6">
                                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
                                    {t("Updated on schedule")}
                                </p>
                                <h3 className="font-display text-xl font-semibold text-white">
                                    {t("Monitoring First")}
                                </h3>
                                <p className="font-body text-sm text-white/70">
                                    {t("Hourly checks keep offers fresh while preserving historical context for quick market reads.")}
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    <footer className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] px-6 py-5 sm:px-8">
                        <div className="flex flex-col gap-3 font-body text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                {t("MonsterIndex is an independent Monster deals tracking platform.")}
                            </p>
                            <a
                                href={copy.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[color:var(--landing-accent)] underline-offset-4 hover:underline"
                            >
                                {t("View Open Source Repo")}
                            </a>
                        </div>
                        <DeployVersionStrip className="mt-4 border-t border-white/10 pt-4 text-center text-white/70 sm:text-left" />
                    </footer>
                </main>
            </div>
        </>
    );
}

type DeferredSectionProps = {
    children: ReactNode;
    fallback: ReactNode;
    rootMargin?: string;
};

function DeferredSection({
    children,
    fallback,
    rootMargin = "480px 0px",
}: DeferredSectionProps) {
    const [enabled, setEnabled] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (enabled) {
            return;
        }

        const container = containerRef.current;

        if (
            !container ||
            typeof window === "undefined" ||
            typeof window.IntersectionObserver !== "function"
        ) {
            startTransition(() => setEnabled(true));

            return;
        }

        const observer = new window.IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }

                startTransition(() => setEnabled(true));
                observer.disconnect();
            },
            { rootMargin },
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, [enabled, rootMargin]);

    return (
        <div ref={containerRef}>
            {enabled ? (
                <Suspense fallback={fallback}>{children}</Suspense>
            ) : (
                fallback
            )}
        </div>
    );
}

function TrendingTracksSkeleton() {
    return (
        <div
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            aria-hidden="true"
        >
            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-5 shadow-[0_16px_45px_rgba(0,0,0,.35)]"
                >
                    <div className="h-7 w-2/3 rounded-full bg-white/10" />
                    <div className="mt-3 h-4 w-1/2 rounded-full bg-white/10" />
                    <div className="mt-2 h-4 w-3/4 rounded-full bg-white/10" />
                    <div className="mt-2 h-4 w-1/3 rounded-full bg-white/10" />
                    <div className="mt-6 flex gap-2">
                        <div className="h-9 w-36 rounded-full bg-white/10" />
                        <div className="h-9 w-28 rounded-full bg-white/10" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function OfferGridSkeleton() {
    return (
        <div className="space-y-4" aria-hidden="true">
            {Array.from({ length: 2 }).map((_, index) => (
                <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-4 shadow-[0_12px_35px_rgba(0,0,0,.28)] sm:p-6"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="w-full sm:max-w-xl">
                            <div className="h-8 w-2/3 rounded-full bg-white/10" />
                            <div className="mt-3 h-4 w-1/2 rounded-full bg-white/10" />
                        </div>
                        <div className="w-full sm:max-w-[10rem]">
                            <div className="h-8 w-32 rounded-full bg-white/10 sm:ml-auto" />
                            <div className="mt-2 h-4 w-24 rounded-full bg-white/10 sm:ml-auto" />
                        </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, detailIndex) => (
                            <div
                                key={detailIndex}
                                className="h-4 rounded-full bg-white/10"
                            />
                        ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="h-4 w-24 rounded-full bg-white/10" />
                        <div className="flex gap-2">
                            <div className="h-9 w-36 rounded-full bg-white/10" />
                            <div className="h-9 w-32 rounded-full bg-white/10" />
                            <div className="h-9 w-28 rounded-full bg-white/10" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
