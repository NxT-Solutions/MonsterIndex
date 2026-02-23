import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
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
    const { x } = useLocale();

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

    const editMonster = (monster: Monster) => {
        const name = window.prompt(
            x('Monster name', 'Monster naam'),
            monster.name,
        );
        if (!name) return;

        const slug = window.prompt(x('Slug', 'Slug'), monster.slug) ?? monster.slug;
        const sizeLabel =
            window.prompt(
                x('Size label', 'Formaatlabel'),
                monster.size_label ?? '',
            ) ?? '';

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
                        {x('Catalog', 'Catalogus')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Monsters', 'Monsters')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Admin Monsters', 'Admin Monsters')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label={x('Total Monsters', 'Totaal Monsters')}
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
                            label={x('Total Records', 'Totaal Records')}
                            value={stats.records}
                            hint={x('Attached website tracks', 'Gekoppelde website-tracks')}
                            accent="cyan"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Create Monster', 'Monster Maken')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    className="grid gap-3 md:grid-cols-4"
                                    onSubmit={submit}
                                >
                                    <input
                                        className="rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                        placeholder={x('Name', 'Naam')}
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData('name', event.target.value)
                                        }
                                        required
                                    />
                                    <input
                                        className="rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                        placeholder={x(
                                            'Slug (optional)',
                                            'Slug (optioneel)',
                                        )}
                                        value={form.data.slug}
                                        onChange={(event) =>
                                            form.setData('slug', event.target.value)
                                        }
                                    />
                                    <input
                                        className="rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45"
                                        placeholder={x(
                                            'Size label (optional)',
                                            'Formaatlabel (optioneel)',
                                        )}
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
                                        className={cn(
                                            buttonVariants({
                                                variant: 'default',
                                            }),
                                            'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                        )}
                                        disabled={form.processing}
                                    >
                                        {x('Add Monster', 'Monster Toevoegen')}
                                    </button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Most Tracked Monsters', 'Meest Gevolgde Monsters')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarMeter
                                    rows={topByRecords}
                                    emptyLabel={x(
                                        'No monsters in catalog yet.',
                                        'Nog geen monsters in de catalogus.',
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                        <CardHeader>
                            <CardTitle className="font-display text-lg text-white">
                                {x('Monster List', 'Monsterlijst')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/55">
                                        <th className="px-3 py-2">{x('Name', 'Naam')}</th>
                                        <th className="px-3 py-2">{x('Slug', 'Slug')}</th>
                                        <th className="px-3 py-2">{x('Size', 'Formaat')}</th>
                                        <th className="px-3 py-2">{x('Records', 'Records')}</th>
                                        <th className="px-3 py-2">{x('Active', 'Actief')}</th>
                                        <th className="px-3 py-2">{x('Actions', 'Acties')}</th>
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
                                                    ? x('Yes', 'Ja')
                                                    : x('No', 'Nee')}
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
                                                        {x('Open Detail', 'Open Detail')}
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
                                                                    'admin.monsters.destroy',
                                                                    monster.slug,
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
