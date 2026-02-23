import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

type AlertRow = {
    id: number;
    type: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
    monster: {
        name: string;
        slug: string;
    };
    monitor: {
        id: number;
        site: {
            name: string;
        };
    };
};

export default function AlertsIndex({
    alerts,
}: {
    alerts: {
        data: AlertRow[];
    };
}) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    Admin: Alerts
                </h2>
            }
        >
            <Head title="Admin Alerts" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>In-app Alerts</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {alerts.data.length === 0 && (
                                <p className="text-sm text-slate-600">
                                    No alerts yet.
                                </p>
                            )}

                            {alerts.data.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="rounded-lg border border-slate-200 p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="font-semibold">
                                            {alert.title}
                                        </h3>
                                        <span className="text-xs text-slate-500">
                                            {new Date(
                                                alert.created_at,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-700">
                                        {alert.body}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">
                                        Monster: {alert.monster.name} • Store:{' '}
                                        {alert.monitor.site.name} • Type:{' '}
                                        {alert.type}
                                    </p>
                                    {!alert.read_at && (
                                        <button
                                            type="button"
                                            className={buttonVariants({
                                                variant: 'outline',
                                                size: 'sm',
                                            })}
                                            onClick={() =>
                                                router.post(
                                                    route(
                                                        'admin.alerts.mark-read',
                                                        alert.id,
                                                    ),
                                                )
                                            }
                                        >
                                            Mark Read
                                        </button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
