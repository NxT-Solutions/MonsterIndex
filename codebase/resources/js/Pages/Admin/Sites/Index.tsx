import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

interface Site {
    id: number;
    name: string;
    domain: string;
    active: boolean;
}

export default function SitesIndex({ sites }: { sites: Site[] }) {
    const { x } = useLocale();

    const form = useForm({
        name: '',
        domain: '',
        active: true,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(route('admin.sites.store'), {
            onSuccess: () => form.reset('name', 'domain'),
        });
    };

    const editSite = (site: Site) => {
        const name = window.prompt(x('Site name', 'Site naam'), site.name);
        if (!name) return;

        const domain = window.prompt(x('Domain', 'Domein'), site.domain);
        if (!domain) return;

        router.put(route('admin.sites.update', site.id), {
            name,
            domain,
            active: site.active,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    {x('Admin: Sites', 'Admin: Sites')}
                </h2>
            }
        >
            <Head title={x('Admin Sites', 'Admin Sites')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Create Site', 'Site Maken')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-3"
                                onSubmit={submit}
                            >
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder={x('Site name', 'Site naam')}
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                />
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder={x('Domain', 'Domein')}
                                    value={form.data.domain}
                                    onChange={(event) =>
                                        form.setData('domain', event.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="submit"
                                    className={buttonVariants({
                                        variant: 'default',
                                    })}
                                    disabled={form.processing}
                                >
                                    {x('Add Site', 'Site Toevoegen')}
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Sites', 'Sites')}</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left text-sm">
                                <thead>
                                    <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">
                                            {x('Name', 'Naam')}
                                        </th>
                                        <th className="px-3 py-2">
                                            {x('Domain', 'Domein')}
                                        </th>
                                        <th className="px-3 py-2">
                                            {x('Active', 'Actief')}
                                        </th>
                                        <th className="px-3 py-2">
                                            {x('Actions', 'Acties')}
                                        </th>
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
                                                {site.active
                                                    ? x('Yes', 'Ja')
                                                    : x('No', 'Nee')}
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
                                                        {x('Edit', 'Bewerken')}
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
                                                        {x('Delete', 'Verwijderen')}
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
