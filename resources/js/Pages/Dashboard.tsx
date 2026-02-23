import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';

export default function Dashboard({ auth }: PageProps) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    Monitor Overview
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Signed in with Google</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                            <p>
                                <span className="font-medium">Email:</span>{' '}
                                {auth.user?.email}
                            </p>
                            <p>
                                <span className="font-medium">Role:</span>{' '}
                                {auth.user?.role}
                            </p>
                            <p className="text-slate-500">
                                Monster monitor CRUD and scheduler UI will be
                                built on top of this authenticated shell.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
