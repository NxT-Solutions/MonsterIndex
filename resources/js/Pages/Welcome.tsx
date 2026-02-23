import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({
    auth,
    laravelVersion,
    phpVersion,
}: PageProps<{ laravelVersion: string; phpVersion: string }>) {
    return (
        <>
            <Head title="MonsterIndex" />
            <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white text-slate-900">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8">
                    <header className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold tracking-tight">
                            MonsterIndex
                        </h1>
                        <div className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className={buttonVariants({
                                        variant: 'default',
                                    })}
                                >
                                    Open Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className={buttonVariants({
                                        variant: 'default',
                                    })}
                                >
                                    Continue with Google
                                </Link>
                            )}
                        </div>
                    </header>

                    <section className="grid gap-6 md:grid-cols-3">
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Best Monster prices, always</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-slate-600">
                                <p>
                                    Track prices from multiple stores, compare
                                    total cost, and surface the best offer for
                                    each Monster variant.
                                </p>
                                <p>
                                    Current release includes Google OAuth-only
                                    auth and role-gated admin access.
                                </p>
                                {!auth.user && (
                                    <Link
                                        href={route('login')}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'secondary',
                                            }),
                                            'mt-2',
                                        )}
                                    >
                                        Sign in
                                    </Link>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Stack</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-slate-600">
                                <p>Laravel {laravelVersion}</p>
                                <p>PHP {phpVersion}</p>
                                <p>Inertia + React + shadcn/ui</p>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </>
    );
}
