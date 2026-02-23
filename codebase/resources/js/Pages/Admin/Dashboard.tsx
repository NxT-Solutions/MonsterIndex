import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function AdminDashboard() {
    const { x } = useLocale();

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    {x('Admin Console', 'Admin Console')}
                </h2>
            }
        >
            <Head title={x('Admin', 'Admin')} />

            <div className="py-12">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Management', 'Beheer')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                            <p>
                                {x(
                                    'Add monsters, attach site records, and configure selectors from one workflow.',
                                    'Voeg monsters toe, koppel website-records en configureer selectors vanuit één workflow.',
                                )}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href={route('admin.monsters.index')}
                                    className={buttonVariants({
                                        variant: 'outline',
                                        size: 'sm',
                                    })}
                                >
                                    {x('Monsters & Records', 'Monsters & Records')}
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{x('Signals', 'Signalen')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                            <p>
                                {x(
                                    'Review deal alerts generated from monitored snapshots.',
                                    'Bekijk dealmeldingen die zijn gegenereerd op basis van gemonitorde snapshots.',
                                )}
                            </p>
                            <Link
                                href={route('admin.alerts.index')}
                                className={buttonVariants({
                                    variant: 'default',
                                    size: 'sm',
                                })}
                            >
                                {x('Open Alerts', 'Open Meldingen')}
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
