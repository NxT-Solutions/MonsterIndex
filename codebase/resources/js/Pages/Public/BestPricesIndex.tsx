import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

type BestPriceRow = {
    id: number;
    monster: {
        name: string;
        slug: string;
        size_label: string | null;
    };
    site: string | null;
    domain: string | null;
    currency: string;
    price_cents: number | null;
    shipping_cents: number | null;
    can_count: number | null;
    price_per_can_cents: number | null;
    effective_total_cents: number;
    effective_total: string;
    checked_at: string | null;
    status: string | null;
    detail_url: string;
};

export default function BestPricesIndex({
    auth,
    bestPrices,
    stats,
}: PageProps<{
    bestPrices: BestPriceRow[];
    stats: {
        tracked_monsters: number;
        offers: number;
    };
}>) {
    return (
        <>
            <Head title="MonsterIndex" />

            <div className="min-h-screen bg-slate-100 text-slate-900">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
                    <header className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                MonsterIndex
                            </h1>
                            <p className="text-sm text-slate-600">
                                Compare live Monster Energy prices and track the
                                current best offer.
                            </p>
                        </div>

                        {auth.user ? (
                            <div className="flex gap-2">
                                <Link
                                    href={route('dashboard')}
                                    className={buttonVariants({
                                        variant: 'secondary',
                                    })}
                                >
                                    Dashboard
                                </Link>
                                {auth.user.role === 'admin' && (
                                    <Link
                                        href={route('admin.dashboard')}
                                        className={buttonVariants({
                                            variant: 'default',
                                        })}
                                    >
                                        Admin
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <Link
                                href={route('login')}
                                className={buttonVariants({ variant: 'default' })}
                            >
                                Continue with Google
                            </Link>
                        )}
                    </header>

                    <section className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Tracked Monsters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-semibold">
                                    {stats.tracked_monsters}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Best Offers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-semibold">
                                    {stats.offers}
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="space-y-3">
                        {bestPrices.length === 0 && (
                            <Card>
                                <CardContent className="pt-6 text-sm text-slate-600">
                                    No best prices available yet. Admins can add
                                    monitors in the admin dashboard.
                                </CardContent>
                            </Card>
                        )}

                        {bestPrices.map((row) => (
                            <Card key={row.id}>
                                <CardHeader>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <CardTitle>
                                            {row.monster.name}
                                            {row.monster.size_label
                                                ? ` (${row.monster.size_label})`
                                                : ''}
                                        </CardTitle>
                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-emerald-700">
                                                {topRightPriceLabel(row)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {volumeLabel(row.can_count)}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-slate-600">
                                    <p>
                                        <strong>Store:</strong> {row.site ?? 'N/A'}
                                        {row.domain ? ` (${row.domain})` : ''}
                                    </p>
                                    <p>
                                        <strong>Price:</strong>{' '}
                                        {row.price_cents !== null
                                            ? formatMoney(
                                                  row.price_cents,
                                                  row.currency,
                                              )
                                            : 'N/A'}
                                        {' • '}
                                        <strong>Shipping:</strong>{' '}
                                        {row.shipping_cents !== null
                                            ? formatMoney(
                                                  row.shipping_cents,
                                                  row.currency,
                                              )
                                            : 'Unknown'}
                                    </p>
                                    <p>
                                        <strong>Total buy:</strong>{' '}
                                        {formatMoney(
                                            row.effective_total_cents,
                                            row.currency,
                                        )}{' '}
                                        ({volumeLabel(row.can_count)})
                                    </p>
                                    <p>
                                        <strong>Status:</strong> {row.status ?? 'N/A'}
                                    </p>
                                    <p>
                                        <strong>Checked:</strong>{' '}
                                        {row.checked_at
                                            ? new Date(
                                                  row.checked_at,
                                              ).toLocaleString()
                                            : 'N/A'}
                                    </p>
                                    <Link
                                        href={row.detail_url}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'outline',
                                                size: 'sm',
                                            }),
                                            'mt-2',
                                        )}
                                    >
                                        View History
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </section>
                </div>
            </div>
        </>
    );
}

function formatMoney(cents: number, currency: string): string {
    return `${currency} ${(cents / 100).toFixed(2)}`;
}

function topRightPriceLabel(row: BestPriceRow): string {
    const perCanCents = effectivePerCanCents(row);
    if (perCanCents !== null) {
        return `${formatMoney(perCanCents, row.currency)} / can`;
    }

    return `${formatMoney(row.effective_total_cents, row.currency)} total`;
}

function effectivePerCanCents(row: BestPriceRow): number | null {
    if (row.price_per_can_cents !== null) {
        return row.price_per_can_cents;
    }

    if (row.can_count !== null && row.can_count > 0) {
        return Math.round(row.effective_total_cents / row.can_count);
    }

    return null;
}

function volumeLabel(canCount: number | null): string {
    if (canCount === null || canCount <= 0) {
        return 'volume unknown';
    }

    return `${canCount}-pack`;
}
