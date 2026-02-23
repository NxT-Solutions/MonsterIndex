import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import type { FormEvent } from 'react';
import { useState } from 'react';

type MonsterDetail = {
    id: number;
    name: string;
    slug: string;
    size_label: string | null;
    active: boolean;
    monitors: MonitorRecord[];
};

type MonitorRecord = {
    id: number;
    product_url: string;
    currency: string;
    check_interval_minutes: number;
    active: boolean;
    next_check_at: string | null;
    selector_config: Record<string, unknown> | null;
    site: {
        id: number;
        name: string;
        domain: string;
    };
    latest_snapshot?: {
        checked_at: string | null;
        effective_total_cents: number | null;
        can_count: number | null;
        price_per_can_cents: number | null;
        currency: string;
        status: string;
    } | null;
};

type BookmarkletSession = {
    selector_browser_url: string;
};

export default function MonsterShow({ monster }: { monster: MonsterDetail }) {
    const form = useForm({
        site_name: '',
        product_url: '',
        currency: 'USD',
        check_interval_minutes: 60,
        active: true,
    });

    const [loadingSelector, setLoadingSelector] = useState<number | null>(null);
    const [loadingRun, setLoadingRun] = useState<number | null>(null);

    const submitRecord = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('admin.monsters.records.store', monster.slug), {
            onSuccess: () => form.reset('site_name', 'product_url'),
        });
    };

    const openSelector = async (record: MonitorRecord) => {
        setLoadingSelector(record.id);

        try {
            const response = await axios.post<BookmarkletSession>(
                route('api.bookmarklet.session'),
                {
                    monitor_id: record.id,
                },
            );

            const selectorBrowserUrl = new URL(response.data.selector_browser_url);
            selectorBrowserUrl.searchParams.set('url', record.product_url);
            window.location.assign(selectorBrowserUrl.toString());
        } catch {
            window.alert('Could not open selector browser. Try reloading this page.');
        } finally {
            setLoadingSelector(null);
        }
    };

    const runNow = async (record: MonitorRecord) => {
        setLoadingRun(record.id);

        try {
            await axios.post(route('api.admin.monitors.run-now', record.id));
        } finally {
            setLoadingRun(null);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Link
                        href={route('admin.monsters.index')}
                        className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                        )}
                    >
                        Back
                    </Link>
                    <h2 className="text-xl font-semibold leading-tight text-slate-800">
                        {monster.name}
                        {monster.size_label ? ` (${monster.size_label})` : ''}
                    </h2>
                </div>
            }
        >
            <Head title={`Monster: ${monster.name}`} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Website Record</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-4"
                                onSubmit={submitRecord}
                            >
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Website name (optional)"
                                    value={form.data.site_name}
                                    onChange={(event) =>
                                        form.setData('site_name', event.target.value)
                                    }
                                />
                                <input
                                    className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="https://example.com/product-url"
                                    value={form.data.product_url}
                                    onChange={(event) =>
                                        form.setData('product_url', event.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="submit"
                                    className={buttonVariants({ variant: 'default' })}
                                    disabled={form.processing}
                                >
                                    Add Record
                                </button>
                            </form>
                            <p className="mt-2 text-xs text-slate-500">
                                After adding the URL, click "Start Guided Selector" to pick price, shipping, and can-count elements visually.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Website Records</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            {monster.monitors.length === 0 ? (
                                <p className="text-sm text-slate-600">
                                    No records yet. Add a website product URL first.
                                </p>
                            ) : (
                                <table className="w-full min-w-[980px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                                            <th className="px-3 py-2">Site</th>
                                            <th className="px-3 py-2">Product URL</th>
                                            <th className="px-3 py-2">Selector</th>
                                            <th className="px-3 py-2">Latest</th>
                                            <th className="px-3 py-2">Next Check</th>
                                            <th className="px-3 py-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monster.monitors.map((record) => (
                                            <tr
                                                key={record.id}
                                                className="border-b border-slate-200 align-top"
                                            >
                                                <td className="px-3 py-2">
                                                    <p className="font-medium text-slate-800">
                                                        {record.site.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {record.site.domain}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <a
                                                        href={record.product_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="break-all text-slate-700 underline"
                                                    >
                                                        {record.product_url}
                                                    </a>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {hasPriceSelector(record)
                                                        ? 'Configured'
                                                        : 'Missing'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {record.latest_snapshot
                                                        ? latestSnapshotLabel(record)
                                                        : 'No checks yet'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {record.next_check_at
                                                        ? new Date(
                                                              record.next_check_at,
                                                          ).toLocaleString()
                                                        : 'N/A'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            className={buttonVariants(
                                                                {
                                                                    variant:
                                                                        'outline',
                                                                    size: 'sm',
                                                                },
                                                            )}
                                                            disabled={
                                                                loadingSelector ===
                                                                record.id
                                                            }
                                                            onClick={() =>
                                                                openSelector(record)
                                                            }
                                                        >
                                                            {loadingSelector ===
                                                            record.id
                                                                ? 'Opening...'
                                                                : 'Start Guided Selector'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={buttonVariants(
                                                                {
                                                                    variant:
                                                                        'default',
                                                                    size: 'sm',
                                                                },
                                                            )}
                                                            disabled={
                                                                loadingRun ===
                                                                record.id
                                                            }
                                                            onClick={() =>
                                                                runNow(record)
                                                            }
                                                        >
                                                            Run Now
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={buttonVariants(
                                                                {
                                                                    variant:
                                                                        'secondary',
                                                                    size: 'sm',
                                                                },
                                                            )}
                                                            onClick={() =>
                                                                router.delete(
                                                                    route(
                                                                        'admin.monitors.destroy',
                                                                        record.id,
                                                                    ),
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function hasPriceSelector(record: MonitorRecord): boolean {
    const selectorConfig = record.selector_config;
    if (!selectorConfig || typeof selectorConfig !== 'object') {
        return false;
    }

    const price = selectorConfig.price as
        | {
              css?: string;
              xpath?: string;
              parts?: Array<{ css?: string; xpath?: string }>;
          }
        | undefined;

    if ((price?.css ?? '').trim() || (price?.xpath ?? '').trim()) {
        return true;
    }

    return (price?.parts ?? []).some(
        (part) => (part.css ?? '').trim() !== '' || (part.xpath ?? '').trim() !== '',
    );
}

function latestSnapshotLabel(record: MonitorRecord): string {
    const latest = record.latest_snapshot;
    if (!latest) {
        return 'No checks yet';
    }

    if (latest.effective_total_cents === null) {
        return latest.status;
    }

    const total = `${latest.currency} ${(latest.effective_total_cents / 100).toFixed(2)}`;
    const perCan =
        latest.price_per_can_cents !== null
            ? ` | per can ${latest.currency} ${(latest.price_per_can_cents / 100).toFixed(2)}${latest.can_count !== null ? ` (${latest.can_count} cans)` : ''}`
            : '';

    return `${total}${perCan} (${latest.status})`;
}
