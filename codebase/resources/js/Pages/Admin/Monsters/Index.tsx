import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import { useAppDialogs } from '@/Components/providers/AppDialogProvider';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, type FormEvent } from 'react';

interface Monster {
    id: number;
    name: string;
    slug: string;
    size_label: string | null;
    active: boolean;
    monitors_count: number;
}

export default function MonstersIndex({ monsters }: { monsters: Monster[] }) {
    const { t } = useLocale();
    const { prompt } = useAppDialogs();

    const form = useForm({
        name: '',
        slug: '',
        size_label: '',
        active: true,
    });

    const stats = useMemo(() => {
        const active = monsters.filter((monster) => monster.active).length;
        const records = monsters.reduce(
            (sum, monster) => sum + monster.monitors_count,
            0,
        );

        return {
            total: monsters.length,
            active,
            inactive: monsters.length - active,
            records,
        };
    }, [monsters]);

    const topByRecords = useMemo(() => {
        return [...monsters]
            .sort((left, right) => right.monitors_count - left.monitors_count)
            .slice(0, 6)
            .map((monster) => ({
                id: monster.id,
                label: monster.name,
                value: monster.monitors_count,
                hint: monster.size_label ?? undefined,
            }));
    }, [monsters]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(route('admin.monsters.store'), {
            onSuccess: () => form.reset('name', 'slug', 'size_label'),
        });
    };

    const editMonster = async (monster: Monster) => {
        const name = await prompt({
            title: t('Edit monster'),
            description: t('Update the display name for this monster.'),
            label: t('Monster name'),
            defaultValue: monster.name,
            required: true,
            confirmLabel: t('Continue'),
        });
        if (!name) {
            return;
        }

        const slug =
            (await prompt({
                title: t('Edit slug'),
                description: t('Adjust the slug if you want a different URL path.'),
                label: t('Slug'),
                defaultValue: monster.slug,
                confirmLabel: t('Continue'),
            })) ?? monster.slug;
        const sizeLabel =
            (await prompt({
                title: t('Edit size label'),
                description: t('Add or update the optional size label shown next to the monster name.'),
                label: t('Size label'),
                defaultValue: monster.size_label ?? '',
                confirmLabel: t('Save changes'),
            })) ?? '';

        router.put(route('admin.monsters.update', monster.slug), {
            name,
            slug,
            size_label: sizeLabel,
            active: monster.active,
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
                        {t('Monsters')}
                    </h2>
                </div>
            }
        >
            <Head title={t('Admin Monsters')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label={t('Total Monsters')}
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
                            label={t('Total Records')}
                            value={stats.records}
                            hint={t('Attached website tracks')}
                            accent="cyan"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Create Monster')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    className="grid gap-3 md:grid-cols-4"
                                    onSubmit={submit}
                                >
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="create-monster-name"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {t('Name')}
                                        </label>
                                        <input
                                            id="create-monster-name"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={t('Name')}
                                            value={form.data.name}
                                            onChange={(event) =>
                                                form.setData('name', event.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="create-monster-slug"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {t('Slug (optional)')}
                                        </label>
                                        <input
                                            id="create-monster-slug"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={t('Slug (optional)')}
                                            value={form.data.slug}
                                            onChange={(event) =>
                                                form.setData('slug', event.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="create-monster-size-label"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {t('Size label (optional)')}
                                        </label>
                                        <input
                                            id="create-monster-size-label"
                                            className="w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                            placeholder={t('Size label (optional)')}
                                            value={form.data.size_label}
                                            onChange={(event) =>
                                                form.setData(
                                                    'size_label',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="create-monster-submit"
                                            className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
                                        >
                                            {t('Action')}
                                        </label>
                                        <button
                                            id="create-monster-submit"
                                            type="submit"
                                            className={cn(
                                                buttonVariants({
                                                    variant: 'default',
                                                }),
                                                'w-full bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                            )}
                                            disabled={form.processing}
                                        >
                                            {t('Add Monster')}
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {t('Most Tracked Monsters')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarMeter
                                    rows={topByRecords}
                                    emptyLabel={t('No monsters in catalog yet.')}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {t('Monster List')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/55">
                                        <th className="px-3 py-2">{t('Name')}</th>
                                        <th className="px-3 py-2">{t('Slug')}</th>
                                        <th className="px-3 py-2">{t('Size')}</th>
                                        <th className="px-3 py-2">{t('Records')}</th>
                                        <th className="px-3 py-2">{t('Active')}</th>
                                        <th className="px-3 py-2">{t('Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monsters.map((monster) => (
                                        <tr
                                            key={monster.id}
                                            className="border-b border-white/10 text-white/85"
                                        >
                                            <td className="px-3 py-2 font-medium text-white">
                                                {monster.name}
                                            </td>
                                            <td className="px-3 py-2 text-white/70">
                                                {monster.slug}
                                            </td>
                                            <td className="px-3 py-2 text-white/70">
                                                {monster.size_label ?? '-'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {monster.monitors_count}
                                            </td>
                                            <td className="px-3 py-2">
                                                {monster.active
                                                    ? t('Yes')
                                                    : t('No')}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex flex-wrap gap-2">
                                                    <Link
                                                        href={route(
                                                            'admin.monsters.show',
                                                            monster.slug,
                                                        )}
                                                        className={cn(
                                                            buttonVariants({
                                                                variant: 'default',
                                                                size: 'sm',
                                                            }),
                                                            'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                                        )}
                                                    >
                                                        {t('Open Detail')}
                                                    </Link>
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
                                                            editMonster(monster)
                                                        }
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
                                                            'border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20',
                                                        )}
                                                        onClick={() =>
                                                            router.delete(
                                                                route(
                                                                    'admin.monsters.destroy',
                                                                    monster.slug,
                                                                ),
                                                            )
                                                        }
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
