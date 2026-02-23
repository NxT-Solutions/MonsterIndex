import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard({ auth }: PageProps) {
    const { x } = useLocale();

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Workspace', 'Werkruimte')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Dashboard', 'Dashboard')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Dashboard', 'Dashboard')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            label={x('Signed-in User', 'Aangemelde Gebruiker')}
                            value={auth.user?.name ?? '-'}
                            hint={auth.user?.email ?? undefined}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Role', 'Rol')}
                            value={
                                auth.user?.role === 'admin'
                                    ? x('Admin', 'Admin')
                                    : x('User', 'Gebruiker')
                            }
                            hint={x(
                                'Access level in this workspace',
                                'Toegangsniveau in deze werkruimte',
                            )}
                            accent="cyan"
                        />
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Explore Deals', 'Verken Deals')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-white/75">
                                <p>
                                    {x(
                                        'Use the public board to browse current best Monster offers.',
                                        'Gebruik het publieke bord om huidige beste Monster-aanbiedingen te bekijken.',
                                    )}
                                </p>
                                <Link
                                    href={route('home')}
                                    className={cn(
                                        buttonVariants({
                                            variant: 'secondary',
                                            size: 'sm',
                                        }),
                                        'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                    )}
                                >
                                    {x('Open Public Board', 'Open Publiek Bord')}
                                </Link>
                            </CardContent>
                        </Card>

                        {auth.user?.role === 'admin' && (
                            <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                                <CardHeader>
                                    <CardTitle className="font-display text-lg text-white">
                                        {x('Admin Controls', 'Adminbesturing')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-white/75">
                                    <p>
                                        {x(
                                            'Manage monsters, monitors, and alerts from the operations dashboard.',
                                            'Beheer monsters, monitoren en meldingen vanuit het operationele dashboard.',
                                        )}
                                    </p>
                                    <Link
                                        href={route('admin.dashboard')}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'default',
                                                size: 'sm',
                                            }),
                                            'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                        )}
                                    >
                                        {x('Open Admin Console', 'Open Admin Console')}
                                    </Link>
                                </CardContent>
                            </Card>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
