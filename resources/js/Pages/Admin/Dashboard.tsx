import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function AdminDashboard() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    Admin Console
                </h2>
            }
        >
            <Head title="Admin" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Admin Access Confirmed</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                            <p>
                                This area is restricted to users whose Google
                                email appears in
                                <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">
                                    config/authz.php
                                </code>
                                .
                            </p>
                            <p className="text-slate-500">
                                Next step is implementing monster, site, and
                                monitor management screens.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
