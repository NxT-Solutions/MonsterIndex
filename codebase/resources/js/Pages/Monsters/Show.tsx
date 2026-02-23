import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Head, Link } from '@inertiajs/react';

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
    monster,
    snapshots,
}: {
    monster: {
        id: number;
        name: string;
        slug: string;
        size_label: string | null;
    };
    snapshots: Snapshot[];
}) {
    return (
        <>
            <Head title={`${monster.name} prices`} />
            <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-6xl space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold">
                                {monster.name}
                                {monster.size_label
                                    ? ` (${monster.size_label})`
                                    : ''}
                            </h1>
                            <p className="text-sm text-slate-600">
                                Snapshot history and store comparisons.
                            </p>
                        </div>
                        <Link
                            href={route('home')}
                            className={buttonVariants({ variant: 'secondary' })}
                        >
                            Back to Board
                        </Link>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Snapshot History</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[960px] text-left text-sm">
                                <thead>
                                    <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">Checked</th>
                                        <th className="px-3 py-2">Store</th>
                                        <th className="px-3 py-2">Price</th>
                                        <th className="px-3 py-2">Shipping</th>
                                        <th className="px-3 py-2">Total</th>
                                        <th className="px-3 py-2">Per Can</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">Product URL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {snapshots.map((snapshot) => (
                                        <tr
                                            key={snapshot.id}
                                            className="border-b border-slate-200"
                                        >
                                            <td className="px-3 py-2">
                                                {snapshot.checked_at
                                                    ? new Date(
                                                          snapshot.checked_at,
                                                      ).toLocaleString()
                                                    : 'N/A'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {snapshot.site.name}
                                            </td>
                                            <td className="px-3 py-2">
                                                {snapshot.price_cents !== null
                                                    ? formatMoney(
                                                          snapshot.price_cents,
                                                          snapshot.currency,
                                                      )
                                                    : 'N/A'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {snapshot.shipping_cents !== null
                                                    ? formatMoney(
                                                          snapshot.shipping_cents,
                                                          snapshot.currency,
                                                      )
                                                    : 'Unknown'}
                                            </td>
                                            <td className="px-3 py-2 font-semibold">
                                                {snapshot.effective_total_cents !==
                                                null
                                                    ? formatMoney(
                                                          snapshot.effective_total_cents,
                                                          snapshot.currency,
                                                      )
                                                    : 'N/A'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {effectivePerCanCents(snapshot) !==
                                                null
                                                    ? formatMoney(
                                                          effectivePerCanCents(
                                                              snapshot,
                                                          ) as number,
                                                          snapshot.currency,
                                                      )
                                                    : 'Unknown'}
                                                {snapshot.can_count !== null
                                                    ? ` (${snapshot.can_count}-pack)`
                                                    : ''}
                                            </td>
                                            <td className="px-3 py-2">
                                                {snapshot.status}
                                                {snapshot.error_code
                                                    ? ` (${snapshot.error_code})`
                                                    : ''}
                                            </td>
                                            <td className="px-3 py-2">
                                                <a
                                                    href={snapshot.site.product_url}
                                                    className="text-orange-600 underline"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
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
