import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, type FormEvent } from 'react';

type Store = {
    id: number;
    name: string;
    domain: string;
    active: boolean;
    monitors_count: number;
};

export default function StoresIndex({ stores }: { stores: Store[] }) {
    const { x } = useLocale();

    const form = useForm({
        name: '',
        domain: '',
        active: true,
    });

    const stats = useMemo(() => {
        const active = stores.filter((store) => store.active).length;
        const usedByMonitors = stores.filter(
            (store) => store.monitors_count > 0,
        ).length;
        const totalMonitors = stores.reduce(
            (sum, store) => sum + store.monitors_count,
            0,
        );

        return {
            total: stores.length,
            active,
            inactive: stores.length - active,
            usedByMonitors,
            totalMonitors,
        };
    }, [stores]);

    const topTrackedStores = useMemo(() => {
        return [...stores]
            .sort((left, right) => right.monitors_count - left.monitors_count)
            .slice(0, 6)
            .map((store) => ({
                id: store.id,
                label: store.name,
                hint: store.domain,
                value: store.monitors_count,
            }));
    }, [stores]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('admin.stores.store'), {
            onSuccess: () => form.reset('name', 'domain'),
        });
    };

    const editStore = (store: Store) => {
        const name = window.prompt(x('Store name', 'Winkelnaam'), store.name);
        if (!name) return;

        const domain =
            window.prompt(x('Domain', 'Domein'), store.domain) ?? store.domain;

        router.put(route('admin.stores.update', store.id), {
            name,
            domain,
            active: store.active,
        });
    };

    const toggleStore = (store: Store) => {
        router.put(route('admin.stores.update', store.id), {
            name: store.name,
            domain: store.domain,
            active: !store.active,
        });
    };

    const deleteStore = (store: Store) => {
        router.delete(route('admin.stores.destroy', store.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Catalog', 'Catalogus')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Stores', 'Winkels')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Admin Stores', 'Admin Winkels')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <KpiCard
                            label={x('Total Stores', 'Totaal Winkels')}
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
                        <KpiCard
                            label={x('Used By Monitors', 'Gebruikt Door Monitoren')}
                            value={stats.usedByMonitors}
                            accent="cyan"
                        />
                        <KpiCard
                            label={x('Total Monitor Links', 'Totale Monitor Links')}
                            value={stats.totalMonitors}
                            accent="orange"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Create Store', 'Winkel Maken')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    className="grid gap-3 md:grid-cols-12"
                                    onSubmit={submit}
                                >
                                    <div className="min-w-0 space-y-1.5 md:col-span-5">
                                        <label
                                            htmlFor="create-store-name"
                                            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Name', 'Naam')}
                                        </label>
                                        <input
                                            id="create-store-name"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={x(
                                                'Example: Amazon',
                                                'Voorbeeld: Amazon',
                                            )}
                                            value={form.data.name}
                                            onChange={(event) =>
                                                form.setData('name', event.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="min-w-0 space-y-1.5 md:col-span-5">
                                        <label
                                            htmlFor="create-store-domain"
                                            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Domain', 'Domein')}
                                        </label>
                                        <input
                                            id="create-store-domain"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={x(
                                                'amazon.com or https://amazon.com',
                                                'amazon.com of https://amazon.com',
                                            )}
                                            value={form.data.domain}
                                            onChange={(event) =>
                                                form.setData('domain', event.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="min-w-0 space-y-1.5 md:col-span-2">
                                        <label
                                            htmlFor="create-store-active"
                                            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {x('Status', 'Status')}
                                        </label>
                                        <select
                                            id="create-store-active"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white"
                                            value={form.data.active ? '1' : '0'}
                                            onChange={(event) =>
                                                form.setData('active', event.target.value === '1')
                                            }
                                        >
                                            <option className="text-black" value="1">
                                                {x('Active', 'Actief')}
                                            </option>
                                            <option className="text-black" value="0">
                                                {x('Inactive', 'Inactief')}
                                            </option>
                                        </select>
                                    </div>
                                    <div className="min-w-0 md:col-span-12 md:flex md:justify-end">
                                        <button
                                            type="submit"
                                            className={cn(
                                                buttonVariants({
                                                    variant: 'default',
                                                }),
                                                'w-full bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95 sm:w-auto sm:min-w-32',
                                            )}
                                            disabled={form.processing}
                                        >
                                            {x('Add Store', 'Winkel Toevoegen')}
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Most Used Stores', 'Meest Gebruikte Winkels')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarMeter
                                    rows={topTrackedStores}
                                    emptyLabel={x(
                                        'No stores yet.',
                                        'Nog geen winkels.',
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Store List', 'Winkellijst')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/55">
                                        <th className="px-3 py-2">{x('Name', 'Naam')}</th>
                                        <th className="px-3 py-2">{x('Domain', 'Domein')}</th>
                                        <th className="px-3 py-2">{x('Monitors', 'Monitoren')}</th>
                                        <th className="px-3 py-2">{x('Active', 'Actief')}</th>
                                        <th className="px-3 py-2">{x('Actions', 'Acties')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stores.map((store) => (
                                        <tr
                                            key={store.id}
                                            className="border-b border-white/10 text-white/85"
                                        >
                                            <td className="px-3 py-2 font-medium text-white">
                                                {store.name}
                                            </td>
                                            <td className="px-3 py-2 text-white/70">
                                                {store.domain}
                                            </td>
                                            <td className="px-3 py-2">{store.monitors_count}</td>
                                            <td className="px-3 py-2">
                                                {store.active
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
                                                        onClick={() => editStore(store)}
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
                                                            'border border-white/20 bg-white/10 text-white hover:bg-white/20',
                                                        )}
                                                        onClick={() => toggleStore(store)}
                                                    >
                                                        {store.active
                                                            ? x('Disable', 'Uitschakelen')
                                                            : x('Enable', 'Inschakelen')}
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
                                                        onClick={() => deleteStore(store)}
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
