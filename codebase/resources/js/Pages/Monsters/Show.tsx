import LandingNav from '@/Components/public/LandingNav';
import { buttonVariants } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useMemo } from 'react';

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
}: PageProps<{
    monster: {
        id: number;
        name: string;
        slug: string;
        size_label: string | null;
    };
    snapshots: Snapshot[];
}>) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';

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

    return (
        <>
            <Head title={`${monster.name} ${x('prices', 'prijzen')}`} />

            <div className="landing-root dark min-h-screen bg-[color:var(--landing-bg)] text-white">
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
                            </div>

                            <Link
                                href={route('home')}
                                className={cn(
                                    buttonVariants({ variant: 'outline' }),
                                    'border-white/20 bg-transparent text-white hover:bg-white/10',
                                )}
                            >
                                {x('Back to Board', 'Terug naar Bord')}
                            </Link>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--landing-surface)]">
                        <div className="border-b border-white/10 px-6 py-4">
                            <h2 className="font-display text-xl font-semibold text-white">
                                {x('Snapshot History', 'Snapshotgeschiedenis')}
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
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
