import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

interface Monster {
    id: number;
    name: string;
    slug: string;
    size_label: string | null;
    active: boolean;
}

export default function MonstersIndex({ monsters }: { monsters: Monster[] }) {
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
        const name = window.prompt('Monster name', monster.name);
        if (!name) return;

        const slug = window.prompt('Slug', monster.slug) ?? monster.slug;
        const sizeLabel =
            window.prompt('Size label', monster.size_label ?? '') ?? '';

        router.put(route('admin.monsters.update', monster.id), {
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
                    Admin: Monsters
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
                                                                    monster.id,
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
