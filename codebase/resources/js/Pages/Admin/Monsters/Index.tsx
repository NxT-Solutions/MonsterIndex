import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import type { FormEvent } from 'react';
import { useState } from 'react';

interface Monster {
    id: number;
    name: string;
    slug: string;
    size_label: string | null;
    active: boolean;
    monitors: MonitorRecord[];
}

interface MonitorRecord {
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
        currency: string;
        status: string;
    } | null;
}

type BookmarkletSession = {
    selector_browser_url: string;
};

export default function MonstersIndex({ monsters }: { monsters: Monster[] }) {
    const form = useForm({
        name: '',
        slug: '',
        size_label: '',
        active: true,
    });

    const [loadingSelector, setLoadingSelector] = useState<number | null>(null);
    const [loadingRun, setLoadingRun] = useState<number | null>(null);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(route('admin.monsters.store'), {
            onSuccess: () => form.reset('name', 'slug', 'size_label'),
        });
    };

    const editMonster = (monster: Monster) => {
        const name = window.prompt('Monster name', monster.name);
        if (!name) return;

        const slug = window.prompt('Slug', monster.slug) ?? monster.slug;
        const sizeLabel =
            window.prompt('Size label', monster.size_label ?? '') ?? '';

        router.put(route('admin.monsters.update', monster.slug), {
            name,
            slug,
            size_label: sizeLabel,
            active: monster.active,
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
            window.alert('Could not open selector browser. Try reloading the page.');
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
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    Admin: Monsters & Site Records
                </h2>
            }
        >
            <Head title="Admin Monsters" />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Monster</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-4"
                                onSubmit={submit}
                            >
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                />
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Slug (optional)"
                                    value={form.data.slug}
                                    onChange={(event) =>
                                        form.setData('slug', event.target.value)
                                    }
                                />
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Size label (optional)"
                                    value={form.data.size_label}
                                    onChange={(event) =>
                                        form.setData(
                                            'size_label',
                                            event.target.value,
                                        )
                                    }
                                />
                                <button
                                    type="submit"
                                    className={buttonVariants({
                                        variant: 'default',
                                    })}
                                    disabled={form.processing}
                                >
                                    Add Monster
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Monsters</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-left text-sm">
                                <thead>
                                    <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">Name</th>
                                        <th className="px-3 py-2">Slug</th>
                                        <th className="px-3 py-2">Size</th>
                                        <th className="px-3 py-2">Active</th>
                                        <th className="px-3 py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monsters.map((monster) => (
                                        <tr
                                            key={monster.id}
                                            className="border-b border-slate-200"
                                        >
                                            <td className="px-3 py-2">
                                                {monster.name}
                                            </td>
                                            <td className="px-3 py-2">
                                                {monster.slug}
                                            </td>
                                            <td className="px-3 py-2">
                                                {monster.size_label ?? '-'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {monster.active ? 'Yes' : 'No'}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        className={buttonVariants({
                                                            variant: 'outline',
                                                            size: 'sm',
                                                        })}
                                                        onClick={() =>
                                                            editMonster(monster)
                                                        }
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={buttonVariants({
                                                            variant: 'secondary',
                                                            size: 'sm',
                                                        })}
                                                        onClick={() =>
                                                            router.delete(
                                                                route(
                                                                    'admin.monsters.destroy',
                                                                    monster.slug,
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
                        </CardContent>
                    </Card>

                    {monsters.map((monster) => (
                        <Card key={monster.id}>
                            <CardHeader className="gap-2">
                                <CardTitle className="flex items-center justify-between gap-4">
                                    <span>
                                        {monster.name}
                                        {monster.size_label
                                            ? ` (${monster.size_label})`
                                            : ''}
                                    </span>
                                    <span className="text-sm font-medium text-slate-500">
                                        {monster.active ? 'Active' : 'Inactive'}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <MonsterRecordForm monsterSlug={monster.slug} />

                                {monster.monitors.length === 0 ? (
                                    <p className="text-sm text-slate-600">
                                        No site records yet. Add a product URL,
                                        then open selector to tag price and
                                        shipping elements.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[950px] text-left text-sm">
                                            <thead>
                                                <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                                                    <th className="px-3 py-2">
                                                        Site
                                                    </th>
                                                    <th className="px-3 py-2">
                                                        Product URL
                                                    </th>
                                                    <th className="px-3 py-2">
                                                        Selector
                                                    </th>
                                                    <th className="px-3 py-2">
                                                        Latest
                                                    </th>
                                                    <th className="px-3 py-2">
                                                        Interval
                                                    </th>
                                                    <th className="px-3 py-2">
                                                        Active
                                                    </th>
                                                    <th className="px-3 py-2">
                                                        Actions
                                                    </th>
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
                                                                {
                                                                    record.site
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {
                                                                    record.site
                                                                        .domain
                                                                }
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <a
                                                                href={
                                                                    record.product_url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="break-all text-slate-700 underline"
                                                            >
                                                                {
                                                                    record.product_url
                                                                }
                                                            </a>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {hasPriceSelector(
                                                                record,
                                                            )
                                                                ? 'Configured'
                                                                : 'Missing'}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {record.latest_snapshot
                                                                ? latestSnapshotLabel(
                                                                      record,
                                                                  )
                                                                : 'No checks yet'}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {
                                                                record.check_interval_minutes
                                                            }
                                                            m
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {record.active
                                                                ? 'Yes'
                                                                : 'No'}
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
                                                                        openSelector(
                                                                            record,
                                                                        )
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
                                                                        runNow(
                                                                            record,
                                                                        )
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
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function MonsterRecordForm({ monsterSlug }: { monsterSlug: string }) {
    const form = useForm({
        site_name: '',
        product_url: '',
        currency: 'USD',
        check_interval_minutes: 60,
        active: true,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('admin.monsters.records.store', monsterSlug), {
            onSuccess: () => form.reset('site_name', 'product_url'),
        });
    };

    return (
        <form className="grid gap-3 md:grid-cols-5" onSubmit={submit}>
            <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Site name (optional)"
                value={form.data.site_name}
                onChange={(event) => form.setData('site_name', event.target.value)}
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
            <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Currency"
                value={form.data.currency}
                onChange={(event) => form.setData('currency', event.target.value)}
                required
            />
            <div className="flex gap-2">
                <input
                    type="number"
                    min={15}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Interval"
                    value={form.data.check_interval_minutes}
                    onChange={(event) =>
                        form.setData(
                            'check_interval_minutes',
                            Number(event.target.value),
                        )
                    }
                    required
                />
                <button
                    type="submit"
                    className={buttonVariants({ variant: 'default' })}
                    disabled={form.processing}
                >
                    Add
                </button>
            </div>
        </form>
    );
}

function hasPriceSelector(record: MonitorRecord): boolean {
    const selectorConfig = record.selector_config;
    if (!selectorConfig || typeof selectorConfig !== 'object') {
        return false;
    }

    const price = selectorConfig.price as
        | { css?: string; xpath?: string }
        | undefined;

    return Boolean((price?.css ?? '').trim() || (price?.xpath ?? '').trim());
}

function latestSnapshotLabel(record: MonitorRecord): string {
    const latest = record.latest_snapshot;
    if (!latest) {
        return 'No checks yet';
    }

    if (latest.effective_total_cents === null) {
        return latest.status;
    }

    return `${latest.currency} ${(latest.effective_total_cents / 100).toFixed(2)} (${latest.status})`;
}
