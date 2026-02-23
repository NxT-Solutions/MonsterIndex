import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

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
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    {x('Admin: Monsters', 'Admin: Monsters')}
                </h2>
            }
        >
            <Head title={x('Admin Monsters', 'Admin Monsters')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Create Monster', 'Monster Maken')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-4"
                                onSubmit={submit}
                            >
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder={x('Name', 'Naam')}
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                />
                                <input
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                                    className={buttonVariants({
                                        variant: 'default',
                                    })}
                                    disabled={form.processing}
                                >
                                    {x('Add Monster', 'Monster Toevoegen')}
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Monsters', 'Monsters')}</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">
                                            {x('Name', 'Naam')}
                                        </th>
                                        <th className="px-3 py-2">
                                            {x('Slug', 'Slug')}
                                        </th>
                                        <th className="px-3 py-2">
                                            {x('Size', 'Formaat')}
                                        </th>
                                        <th className="px-3 py-2">
                                            {x('Records', 'Records')}
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
                                                {monster.monitors_count}
                                            </td>
                                            <td className="px-3 py-2">
                                                {monster.active
                                                    ? x('Yes', 'Ja')
                                                    : x('No', 'Nee')}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={route(
                                                            'admin.monsters.show',
                                                            monster.slug,
                                                        )}
                                                        className={buttonVariants({
                                                            variant: 'default',
                                                            size: 'sm',
                                                        })}
                                                    >
                                                        {x(
                                                            'Open Detail',
                                                            'Open Detail',
                                                        )}
                                                    </Link>
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
