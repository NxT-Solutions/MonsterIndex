import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard({ auth }: PageProps) {
    const { x } = useLocale();

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    {x('Dashboard', 'Dashboard')}
                </h2>
            }
        >
            <Head title={x('Dashboard', 'Dashboard')} />

            <div className="py-12">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Account', 'Account')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                            <p>
                                <strong>{x('Email:', 'E-mail:')}</strong>{' '}
                                {auth.user?.email}
                            </p>
                            <p>
                                <strong>{x('Role:', 'Rol:')}</strong>{' '}
                                {auth.user?.role === 'admin'
                                    ? x('admin', 'admin')
                                    : x('user', 'gebruiker')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Next Step', 'Volgende Stap')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                            <p>
                                {x(
                                    'Open the public board or, if you are admin, configure monitors.',
                                    'Open het publieke bord of configureer monitoren als je admin bent.',
                                )}
                            </p>
                            <div className="flex gap-2">
                                <Link
                                    href={route('home')}
                                    className={buttonVariants({
                                        variant: 'secondary',
                                        size: 'sm',
                                    })}
                                >
                                    {x('Public Board', 'Publiek Bord')}
                                </Link>
                                {auth.user?.role === 'admin' && (
                                    <Link
                                        href={route('admin.dashboard')}
                                        className={buttonVariants({
                                            variant: 'default',
                                            size: 'sm',
                                        })}
                                    >
                                        {x('Admin Console', 'Admin Console')}
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
