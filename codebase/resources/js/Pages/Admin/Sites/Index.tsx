import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

interface Site {
    id: number;
    name: string;
    domain: string;
    adapter_key: string | null;
    active: boolean;
}

export default function SitesIndex({
    sites,
    adapterKeys,
}: {
    sites: Site[];
    adapterKeys: string[];
}) {
    const form = useForm({
        name: '',
        domain: '',
        adapter_key: '',
        active: true,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(route('admin.sites.store'), {
            onSuccess: () => form.reset('name', 'domain', 'adapter_key'),
        });
    };

    const editSite = (site: Site) => {
        const name = window.prompt('Site name', site.name);
        if (!name) return;

        const domain = window.prompt('Domain', site.domain);
        if (!domain) return;

        const adapterKey =
            window.prompt(
                `Adapter key (${adapterKeys.join(', ') || 'none'})`,
                site.adapter_key ?? '',
            ) ?? '';

        router.put(route('admin.sites.update', site.id), {
            name,
            domain,
            adapter_key: adapterKey,
            active: site.active,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    Admin: Sites
                </h2>
            }
        >
            <Head title="Admin Sites" />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Site</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-4"
                                onSubmit={submit}
                            >
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Site name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                />
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Domain"
                                    value={form.data.domain}
                                    onChange={(event) =>
                                        form.setData('domain', event.target.value)
                                    }
                                    required
                                />
                                <select
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    value={form.data.adapter_key}
                                    onChange={(event) =>
                                        form.setData(
                                            'adapter_key',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Manual selectors</option>
                                    {adapterKeys.map((key) => (
                                        <option key={key} value={key}>
                                            {key}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    className={buttonVariants({
                                        variant: 'default',
                                    })}
                                    disabled={form.processing}
                                >
                                    Add Site
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Sites</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left text-sm">
                                <thead>
                                    <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">Name</th>
                                        <th className="px-3 py-2">Domain</th>
                                        <th className="px-3 py-2">Adapter</th>
                                        <th className="px-3 py-2">Active</th>
                                        <th className="px-3 py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sites.map((site) => (
                                        <tr
                                            key={site.id}
                                            className="border-b border-slate-200"
                                        >
                                            <td className="px-3 py-2">
                                                {site.name}
                                            </td>
                                            <td className="px-3 py-2">
                                                {site.domain}
                                            </td>
                                            <td className="px-3 py-2">
                                                {site.adapter_key ?? 'manual'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {site.active ? 'Yes' : 'No'}
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
                                                            editSite(site)
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
                                                                    'admin.sites.destroy',
                                                                    site.id,
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
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
