import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import { useAppDialogs } from '@/Components/providers/AppDialogProvider';
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
    const { t } = useLocale();
    const { confirm, prompt } = useAppDialogs();

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

    const editStore = async (store: Store) => {
        const name = await prompt({
            title: t('Edit store'),
            description: t('Update the visible store name.'),
            label: t('Store name'),
            defaultValue: store.name,
            required: true,
            confirmLabel: t('Continue'),
        });
        if (!name) {
            return;
        }

        const domain =
            (await prompt({
                title: t('Edit domain'),
                description: t('Use a bare domain or full URL for matching and admin display.'),
                label: t('Domain'),
                defaultValue: store.domain,
                required: true,
                confirmLabel: t('Save changes'),
            })) ?? store.domain;

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

    const deleteStore = async (store: Store) => {
        const confirmed = await confirm({
            title: t('Delete this store?'),
            description: t('Only remove stores that are no longer needed. Existing monitor links may be affected.'),
            confirmLabel: t('Delete store'),
            cancelLabel: t('Cancel'),
            destructive: true,
        });

        if (!confirmed) {
            return;
        }

        router.delete(route('admin.stores.destroy', store.id), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {t('Catalog')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {t('Stores')}
                    </h2>
                </div>
            }
        >
            <Head title={t('Admin Stores')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <KpiCard
                            label={t('Total Stores')}
                            value={stats.total}
                            accent="lime"
                        />
                        <KpiCard
                            label={t('Active')}
                            value={stats.active}
                            accent="emerald"
                        />
                        <KpiCard
                            label={t('Inactive')}
                            value={stats.inactive}
                            accent="orange"
                        />
                        <KpiCard
                            label={t('Used By Monitors')}
                            value={stats.usedByMonitors}
                            accent="cyan"
                        />
                        <KpiCard
                            label={t('Total Monitor Links')}
                            value={stats.totalMonitors}
                            accent="orange"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Create Store')}
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
                                            {t('Name')}
                                        </label>
                                        <input
                                            id="create-store-name"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={t('Example: Amazon')}
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
                                            {t('Domain')}
                                        </label>
                                        <input
                                            id="create-store-domain"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={t('amazon.com or https://amazon.com')}
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
                                            {t('Status')}
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
                                                {t('Active')}
                                            </option>
                                            <option className="text-black" value="0">
                                                {t('Inactive')}
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
                                            {t('Add Store')}
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Most Used Stores')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarMeter
                                    rows={topTrackedStores}
                                    emptyLabel={t('No stores yet.')}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {t('Store List')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/55">
                                        <th className="px-3 py-2">{t('Name')}</th>
                                        <th className="px-3 py-2">{t('Domain')}</th>
                                        <th className="px-3 py-2">{t('Monitors')}</th>
                                        <th className="px-3 py-2">{t('Active')}</th>
                                        <th className="px-3 py-2">{t('Actions')}</th>
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
                                                    ? t('Yes')
                                                    : t('No')}
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
                                                        {t('Edit')}
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
                                                            ? t('Disable')
                                                            : t('Enable')}
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
                                                        {t('Delete')}
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
