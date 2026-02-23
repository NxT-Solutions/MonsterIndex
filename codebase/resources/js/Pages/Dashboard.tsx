import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard({ auth }: PageProps) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                            <p>
                                <strong>Email:</strong> {auth.user?.email}
                            </p>
                            <p>
                                <strong>Role:</strong> {auth.user?.role}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Next Step</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                            <p>
                                Open the public board or, if you are admin,
                                configure monitors.
                            </p>
                            <div className="flex gap-2">
                                <Link
                                    href={route('home')}
                                    className={buttonVariants({
                                        variant: 'secondary',
                                        size: 'sm',
                                    })}
                                >
                                    Public Board
                                </Link>
                                {auth.user?.role === 'admin' && (
                                    <Link
                                        href={route('admin.dashboard')}
                                        className={buttonVariants({
                                            variant: 'default',
                                            size: 'sm',
                                        })}
                                    >
                                        Admin Console
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
