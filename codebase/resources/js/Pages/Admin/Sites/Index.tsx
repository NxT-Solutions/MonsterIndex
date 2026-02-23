import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, type FormEvent } from 'react';

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

    const stats = useMemo(() => {
        const active = sites.filter((site) => site.active).length;

        return {
            total: sites.length,
            active,
            inactive: sites.length - active,
        };
    }, [sites]);

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
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Sources', 'Bronnen')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Sites', 'Sites')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Admin Sites', 'Admin Sites')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-3">
                        <KpiCard
                            label={x('Total Sites', 'Totaal Sites')}
                            value={stats.total}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Active', 'Actief')}
                            value={stats.active}
                            accent="emerald"
                        />
                        <KpiCard
                            label={x('Inactive', 'Inactief')}
                            value={stats.inactive}
                            accent="orange"
                        />
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Create Site', 'Site Maken')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-3"
                                onSubmit={submit}
                            >
                                <input
                                    className="rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                    placeholder={x('Site name', 'Site naam')}
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                />
                                <input
                                    className="rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                    placeholder={x('Domain', 'Domein')}
                                    value={form.data.domain}
                                    onChange={(event) =>
                                        form.setData('domain', event.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="submit"
                                    className={cn(
                                        buttonVariants({
                                            variant: 'default',
                                        }),
                                        'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                    )}
                                    disabled={form.processing}
                                >
                                    {x('Add Site', 'Site Toevoegen')}
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Site List', 'Sitelijst')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/55">
                                        <th className="px-3 py-2">{x('Name', 'Naam')}</th>
                                        <th className="px-3 py-2">{x('Domain', 'Domein')}</th>
                                        <th className="px-3 py-2">{x('Active', 'Actief')}</th>
                                        <th className="px-3 py-2">{x('Actions', 'Acties')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sites.map((site) => (
                                        <tr
                                            key={site.id}
                                            className="border-b border-white/10 text-white/85"
                                        >
                                            <td className="px-3 py-2 font-medium text-white">
                                                {site.name}
                                            </td>
                                            <td className="px-3 py-2 text-white/70">
                                                {site.domain}
                                            </td>
                                            <td className="px-3 py-2">
                                                {site.active
                                                    ? x('Yes', 'Ja')
                                                    : x('No', 'Nee')}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            buttonVariants({
                                                                variant: 'outline',
                                                                size: 'sm',
                                                            }),
                                                            'border-white/20 bg-transparent text-white hover:bg-white/10',
                                                        )}
                                                        onClick={() =>
                                                            editSite(site)
                                                        }
                                                    >
                                                        {x('Edit', 'Bewerken')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            buttonVariants({
                                                                variant: 'secondary',
                                                                size: 'sm',
                                                            }),
                                                            'border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20',
                                                        )}
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
