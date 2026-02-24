import LandingNav from '@/Components/public/LandingNav';
import { buttonVariants } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import axios from 'axios';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

type Snapshot = {
    id: number;
    checked_at: string | null;
    price_cents: number | null;
    shipping_cents: number | null;
    effective_total_cents: number | null;
    can_count: number | null;
    price_per_can_cents: number | null;
    currency: string;
    status: string;
    error_code: string | null;
    site: {
        name: string;
        domain: string;
        product_url: string;
    };
};

export default function MonsterShow({
    auth,
    monster,
    snapshots,
    available_currencies,
    followed_currencies,
}: PageProps<{
    monster: {
        id: number;
        name: string;
        slug: string;
        size_label: string | null;
    };
    snapshots: Snapshot[];
    available_currencies: string[];
    followed_currencies: string[];
}>) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';
    const canFollow = Boolean(auth.user?.can.monster_follow);
    const followCurrencies = ['EUR'];
    const [followedCurrenciesState, setFollowedCurrenciesState] = useState<string[]>(
        followed_currencies,
    );
    const [loadingCurrency, setLoadingCurrency] = useState<string | null>(null);
    const canonicalUrl = route('monsters.show', monster.slug);
    const pageTitle = `${monster.name}${monster.size_label ? ` (${monster.size_label})` : ''} | ${x(
        'Monster Price History',
        'Monster Prijshistoriek',
    )}`;
    const pageDescription = x(
        `Compare recent prices for ${monster.name}, including total buy and per-can value from tracked stores.`,
        `Vergelijk recente prijzen voor ${monster.name}, inclusief totaalaankoop en prijs per blik van gevolgde winkels.`,
    );
    const ogImageUrl = new URL('/brand/monsterindex-og.png', canonicalUrl).toString();

    const bestSnapshot = useMemo(() => {
        return [...snapshots]
            .filter((snapshot) => snapshot.effective_total_cents !== null)
            .sort((left, right) => {
                const leftPerCan =
                    effectivePerCanCents(left) ?? left.effective_total_cents ?? Number.MAX_SAFE_INTEGER;
                const rightPerCan =
                    effectivePerCanCents(right) ?? right.effective_total_cents ?? Number.MAX_SAFE_INTEGER;

                if (leftPerCan !== rightPerCan) {
                    return leftPerCan - rightPerCan;
                }

                return (right.effective_total_cents ?? Number.MAX_SAFE_INTEGER) -
                    (left.effective_total_cents ?? Number.MAX_SAFE_INTEGER);
            })
            .at(0);
    }, [snapshots]);

    const latestCheckedAt = useMemo(() => {
        return snapshots
            .map((snapshot) => snapshot.checked_at)
            .find((checkedAt) => checkedAt !== null);
    }, [snapshots]);

    const bestPerCan = bestSnapshot ? effectivePerCanCents(bestSnapshot) : null;

    useEffect(() => {
        setFollowedCurrenciesState(followed_currencies);
    }, [followed_currencies]);

    return (
        <>
            <Head title={pageTitle}>
                <meta head-key="description" name="description" content={pageDescription} />
                <meta head-key="robots" name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
                <link head-key="canonical" rel="canonical" href={canonicalUrl} />
                <meta head-key="og:type" property="og:type" content="article" />
                <meta head-key="og:site_name" property="og:site_name" content="MonsterIndex" />
                <meta head-key="og:title" property="og:title" content={pageTitle} />
                <meta head-key="og:description" property="og:description" content={pageDescription} />
                <meta head-key="og:url" property="og:url" content={canonicalUrl} />
                <meta head-key="og:image" property="og:image" content={ogImageUrl} />
                <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
                <meta head-key="twitter:title" name="twitter:title" content={pageTitle} />
                <meta head-key="twitter:description" name="twitter:description" content={pageDescription} />
                <meta head-key="twitter:image" name="twitter:image" content={ogImageUrl} />
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Product',
                        name: `${monster.name}${monster.size_label ? ` (${monster.size_label})` : ''}`,
                        category: 'Energy Drink',
                        brand: {
                            '@type': 'Brand',
                            name: 'Monster Energy',
                        },
                        url: canonicalUrl,
                        description: pageDescription,
                    })}
                </script>
            </Head>

            <div className="landing-root min-h-screen bg-[color:var(--landing-bg)] text-white">
                <LandingNav auth={auth} brandName="MonsterIndex" />

                <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                    <section className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-6 sm:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                                    {x('Monster Track Detail', 'Monster Track Detail')}
                                </p>
                                <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
                                    {monster.name}
                                    {monster.size_label ? ` (${monster.size_label})` : ''}
                                </h1>
                                <p className="mt-2 font-body text-sm text-white/70">
                                    {x(
                                        'Snapshot history, store comparison, and per-can performance in one view.',
                                        'Snapshotgeschiedenis, winkelvergelijking en prestaties per blik in één overzicht.',
                                    )}
                                </p>
                                {canFollow && (
                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                                            {x('Follow alerts', 'Volg meldingen')}
                                        </p>
                                        {followCurrencies.map((currency) => {
                                            const isFollowing =
                                                followedCurrenciesState.includes(currency);
                                            const isLoading = loadingCurrency === currency;

                                            return (
                                                <button
                                                    key={currency}
                                                    type="button"
                                                    disabled={isLoading}
                                                    onClick={async () => {
                                                        setLoadingCurrency(currency);
                                                        try {
                                                            if (isFollowing) {
                                                                await axios.delete(
                                                                    route(
                                                                        'monsters.follow.destroy',
                                                                        monster.slug,
                                                                    ),
                                                                    {
                                                                        data: {
                                                                            currency,
                                                                        },
                                                                        headers: {
                                                                            Accept: 'application/json',
                                                                        },
                                                                    },
                                                                );
                                                                setFollowedCurrenciesState(
                                                                    (current) =>
                                                                        current.filter(
                                                                            (value) =>
                                                                                value !== currency,
                                                                        ),
                                                                );
                                                            } else {
                                                                await axios.post(
                                                                    route(
                                                                        'monsters.follow.store',
                                                                        monster.slug,
                                                                    ),
                                                                    {
                                                                        currency,
                                                                    },
                                                                    {
                                                                        headers: {
                                                                            Accept: 'application/json',
                                                                        },
                                                                    },
                                                                );
                                                                setFollowedCurrenciesState(
                                                                    (current) =>
                                                                        current.includes(currency)
                                                                            ? current
                                                                            : [
                                                                                  ...current,
                                                                                  currency,
                                                                              ],
                                                                );
                                                            }
                                                        } catch {
                                                            window.alert(
                                                                x(
                                                                    'Could not update follow status right now.',
                                                                    'Kon de volgstatus nu niet bijwerken.',
                                                                ),
                                                            );
                                                        } finally {
                                                            setLoadingCurrency(null);
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
                                                    {isLoading
                                                        ? x('Saving...', 'Opslaan...')
                                                        : isFollowing
                                                          ? `${currency} ${x('Following', 'Volgend')}`
                                                          : `${currency} ${x('Follow', 'Volgen')}`}
                                                </button>
                                            );
                                        })}
                                        <span className="text-xs text-white/55">
                                            {x(
                                                'Price alerts are currently EUR-only.',
                                                'Prijsmeldingen zijn momenteel enkel EUR.',
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <Link
                                href={route('home')}
                                className={cn(
                                    buttonVariants({ variant: 'outline' }),
                                    'w-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:w-auto',
                                )}
                            >
                                {x('Back to Board', 'Terug naar Bord')}
                            </Link>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                                    {x('Snapshots', 'Snapshots')}
                                </p>
                                <p className="mt-2 font-display text-3xl font-bold text-[color:var(--landing-accent)]">
                                    {snapshots.length}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                                    {x('Best Per Can', 'Beste Per Blik')}
                                </p>
                                <p className="mt-2 font-display text-2xl font-bold text-cyan-300">
                                    {bestPerCan !== null && bestSnapshot
                                        ? `${formatMoney(bestPerCan, bestSnapshot.currency)} / ${x('can', 'blik')}`
                                        : x('Unknown', 'Onbekend')}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                                    {x('Last Checked', 'Laatst Gecheckt')}
                                </p>
                                <p className="mt-2 font-body text-sm font-medium text-white/85">
                                    {latestCheckedAt
                                        ? new Date(latestCheckedAt).toLocaleString(dateLocale)
                                        : x('N/A', 'N/B')}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                                    {x('Currencies', 'Valuta')}
                                </p>
                                <p className="mt-2 font-body text-sm font-medium text-white/85">
                                    {available_currencies.length > 0
                                        ? available_currencies.join(', ')
                                        : 'EUR'}
                                </p>
                                <p className="mt-1 text-xs text-white/55">
                                    {x('Following supports EUR only.', 'Volgen ondersteunt enkel EUR.')}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--landing-surface)]">
                        <div className="border-b border-white/10 px-6 py-4">
                            <h2 className="font-display text-xl font-semibold text-white">
                                {x('Snapshot History', 'Snapshotgeschiedenis')}
                            </h2>
                        </div>

                        {snapshots.length === 0 && (
                            <div className="px-6 py-5 font-body text-sm text-white/70">
                                {x(
                                    'No snapshots yet for this monster.',
                                    'Nog geen snapshots voor deze monster.',
                                )}
                            </div>
                        )}

                        <div className="grid gap-3 p-4 md:hidden">
                            {snapshots.map((snapshot) => {
                                const perCan = effectivePerCanCents(snapshot);

                                return (
                                    <article
                                        key={snapshot.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-body text-sm font-semibold text-white">
                                                    {snapshot.site.name}
                                                </p>
                                                <p className="font-body text-xs text-white/55">
                                                    {snapshot.site.domain}
                                                </p>
                                            </div>
                                            <p className="font-body text-xs text-white/60">
                                                {snapshot.checked_at
                                                    ? new Date(
                                                          snapshot.checked_at,
                                                      ).toLocaleString(
                                                          dateLocale,
                                                      )
                                                    : x('N/A', 'N/B')}
                                            </p>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 font-body text-xs text-white/75">
                                            <p>
                                                <span className="text-white/55">
                                                    {x('Price', 'Prijs')}:
                                                </span>{' '}
                                                {snapshot.price_cents !== null
                                                    ? formatMoney(
                                                          snapshot.price_cents,
                                                          snapshot.currency,
                                                      )
                                                    : x('N/A', 'N/B')}
                                            </p>
                                            <p>
                                                <span className="text-white/55">
                                                    {x(
                                                        'Shipping',
                                                        'Verzending',
                                                    )}
                                                    :
                                                </span>{' '}
                                                {snapshot.shipping_cents !== null
                                                    ? formatMoney(
                                                          snapshot.shipping_cents,
                                                          snapshot.currency,
                                                      )
                                                    : x('Unknown', 'Onbekend')}
                                            </p>
                                            <p>
                                                <span className="text-white/55">
                                                    {x('Total', 'Totaal')}:
                                                </span>{' '}
                                                <span className="font-semibold text-[color:var(--landing-accent)]">
                                                    {snapshot.effective_total_cents !==
                                                    null
                                                        ? formatMoney(
                                                              snapshot.effective_total_cents,
                                                              snapshot.currency,
                                                          )
                                                        : x('N/A', 'N/B')}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-white/55">
                                                    {x('Per Can', 'Per Blik')}:
                                                </span>{' '}
                                                {perCan !== null
                                                    ? formatMoney(
                                                          perCan,
                                                          snapshot.currency,
                                                      )
                                                    : x('Unknown', 'Onbekend')}
                                                {snapshot.can_count !== null
                                                    ? ` (${snapshot.can_count}-${x('pack', 'pack')})`
                                                    : ''}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            <p className="font-body text-xs text-white/70">
                                                {x('Status', 'Status')}: {snapshot.status}
                                                {snapshot.error_code
                                                    ? ` (${snapshot.error_code})`
                                                    : ''}
                                            </p>
                                            <a
                                                href={snapshot.site.product_url}
                                                className="font-body text-xs text-[color:var(--landing-accent)] underline underline-offset-4"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {x('Open', 'Open')}
                                            </a>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[960px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/55">
                                        <th className="px-4 py-3">{x('Checked', 'Gecheckt')}</th>
                                        <th className="px-4 py-3">{x('Store', 'Winkel')}</th>
                                        <th className="px-4 py-3">{x('Price', 'Prijs')}</th>
                                        <th className="px-4 py-3">{x('Shipping', 'Verzending')}</th>
                                        <th className="px-4 py-3">{x('Total', 'Totaal')}</th>
                                        <th className="px-4 py-3">{x('Per Can', 'Per Blik')}</th>
                                        <th className="px-4 py-3">{x('Status', 'Status')}</th>
                                        <th className="px-4 py-3">{x('Product URL', 'Product-URL')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {snapshots.map((snapshot) => (
                                        <tr
                                            key={snapshot.id}
                                            className="border-b border-white/10 text-white/85 transition-colors hover:bg-white/[0.03]"
                                        >
                                            <td className="px-4 py-3">
                                                {snapshot.checked_at
                                                    ? new Date(snapshot.checked_at).toLocaleString(dateLocale)
                                                    : x('N/A', 'N/B')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-white">
                                                    {snapshot.site.name}
                                                </p>
                                                <p className="text-xs text-white/55">
                                                    {snapshot.site.domain}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {snapshot.price_cents !== null
                                                    ? formatMoney(snapshot.price_cents, snapshot.currency)
                                                    : x('N/A', 'N/B')}
                                            </td>
                                            <td className="px-4 py-3">
                                                {snapshot.shipping_cents !== null
                                                    ? formatMoney(snapshot.shipping_cents, snapshot.currency)
                                                    : x('Unknown', 'Onbekend')}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-[color:var(--landing-accent)]">
                                                {snapshot.effective_total_cents !== null
                                                    ? formatMoney(snapshot.effective_total_cents, snapshot.currency)
                                                    : x('N/A', 'N/B')}
                                            </td>
                                            <td className="px-4 py-3">
                                                {effectivePerCanCents(snapshot) !== null
                                                    ? formatMoney(
                                                          effectivePerCanCents(snapshot) as number,
                                                          snapshot.currency,
                                                      )
                                                    : x('Unknown', 'Onbekend')}
                                                {snapshot.can_count !== null
                                                    ? ` (${snapshot.can_count}-${x('pack', 'pack')})`
                                                    : ''}
                                            </td>
                                            <td className="px-4 py-3">
                                                {snapshot.status}
                                                {snapshot.error_code
                                                    ? ` (${snapshot.error_code})`
                                                    : ''}
                                            </td>
                                            <td className="px-4 py-3">
                                                <a
                                                    href={snapshot.site.product_url}
                                                    className="text-[color:var(--landing-accent)] underline underline-offset-4 hover:text-white"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {x('Open', 'Open')}
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}

function formatMoney(cents: number, currency: string): string {
    return `${currency} ${(cents / 100).toFixed(2)}`;
}

function effectivePerCanCents(snapshot: Snapshot): number | null {
    if (snapshot.price_per_can_cents !== null) {
        return snapshot.price_per_can_cents;
    }

    if (
        snapshot.effective_total_cents !== null &&
        snapshot.can_count !== null &&
        snapshot.can_count > 0
    ) {
        return Math.round(snapshot.effective_total_cents / snapshot.can_count);
    }

    return null;
}
