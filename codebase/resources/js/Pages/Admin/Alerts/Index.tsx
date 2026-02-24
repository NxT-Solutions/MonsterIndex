import BarMeter from '@/Components/admin/BarMeter';
import KpiCard from '@/Components/admin/KpiCard';
import { buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';

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

type TestMonitorRow = {
    id: number;
    label: string;
};

type FollowableMonsterRow = {
    id: number;
    slug: string;
    name: string;
    size_label: string | null;
    label: string;
};

type FollowedPriceDropRow = {
    id: number;
    followed_at: string | null;
    last_alerted_at: string | null;
    currency: string;
    monster: {
        id: number | null;
        name: string | null;
        slug: string | null;
        size_label: string | null;
    };
    best_offer: {
        effective_total_cents: number;
        currency: string;
        can_count: number;
        price_per_can_cents: number;
        assumed_single_can: boolean;
        checked_at: string | null;
        site: string | null;
        domain: string | null;
    } | null;
};

function formatMoney(cents: number, currency = 'EUR'): string {
    return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function AlertsIndex({
    alerts,
    testMonitors,
    followableMonsters,
    followedPriceDrops,
}: {
    alerts: {
        data: AlertRow[];
    };
    testMonitors: TestMonitorRow[];
    followableMonsters: FollowableMonsterRow[];
    followedPriceDrops: FollowedPriceDropRow[];
}) {
    const { locale, x } = useLocale();
    const dateLocale = locale === 'nl' ? 'nl-BE' : 'en-US';
    const testForm = useForm({
        monitor_id: '',
        title: '',
        body: '',
    });
    const followForm = useForm({
        monster_slug: '',
    });

    useEffect(() => {
        if (testMonitors.length > 0 && testForm.data.monitor_id === '') {
            testForm.setData('monitor_id', String(testMonitors[0].id));
        }
    }, [testForm, testMonitors]);

    const followedMonsterIds = useMemo(() => {
        return new Set(
            followedPriceDrops
                .map((follow) => follow.monster.id)
                .filter((id): id is number => typeof id === 'number'),
        );
    }, [followedPriceDrops]);

    const availableMonsters = useMemo(() => {
        return followableMonsters.filter(
            (monster) => !followedMonsterIds.has(monster.id),
        );
    }, [followableMonsters, followedMonsterIds]);

    useEffect(() => {
        if (availableMonsters.length === 0) {
            if (followForm.data.monster_slug !== '') {
                followForm.setData('monster_slug', '');
            }

            return;
        }

        const exists = availableMonsters.some(
            (monster) => monster.slug === followForm.data.monster_slug,
        );

        if (!exists) {
            followForm.setData('monster_slug', availableMonsters[0].slug);
        }
    }, [availableMonsters, followForm]);

    const stats = useMemo(() => {
        const unread = alerts.data.filter((alert) => !alert.read_at).length;
        const today = new Date();
        const last24h = alerts.data.filter((alert) => {
            const created = new Date(alert.created_at).getTime();
            return created >= today.getTime() - 24 * 60 * 60 * 1000;
        }).length;

        return {
            total: alerts.data.length,
            unread,
            read: alerts.data.length - unread,
            last24h,
        };
    }, [alerts.data]);

    const byType = useMemo(() => {
        const grouped = new Map<string, number>();

        alerts.data.forEach((alert) => {
            grouped.set(alert.type, (grouped.get(alert.type) ?? 0) + 1);
        });

        return Array.from(grouped.entries())
            .map(([type, value]) => ({ id: type, label: type, value }))
            .sort((left, right) => right.value - left.value);
    }, [alerts.data]);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--landing-accent)]">
                        {x('Signals', 'Signalen')}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                        {x('Alerts', 'Meldingen')}
                    </h2>
                </div>
            }
        >
            <Head title={x('Admin Alerts', 'Admin Meldingen')} />

            <div className="py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label={x('Loaded Alerts', 'Geladen Meldingen')}
                            value={stats.total}
                            accent="lime"
                        />
                        <KpiCard
                            label={x('Unread', 'Ongelezen')}
                            value={stats.unread}
                            accent="orange"
                        />
                        <KpiCard
                            label={x('Read', 'Gelezen')}
                            value={stats.read}
                            accent="emerald"
                        />
                        <KpiCard
                            label={x('Last 24h', 'Laatste 24u')}
                            value={stats.last24h}
                            accent="cyan"
                        />
                    </section>

                    <section className="grid gap-4 xl:grid-cols-3">
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Trigger Test Alert', 'Trigger Testmelding')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-white/70">
                                    {x(
                                        'Create a manual admin alert from this page. It will also trigger the push pipeline.',
                                        'Maak hier een handmatige adminmelding. Dit triggert ook de push-pipeline.',
                                    )}
                                </p>
                                <form
                                    className="space-y-3"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        testForm.post(
                                            route('admin.alerts.trigger-test'),
                                            {
                                                preserveScroll: true,
                                                onSuccess: () =>
                                                    testForm.reset(
                                                        'title',
                                                        'body',
                                                    ),
                                            },
                                        );
                                    }}
                                >
                                    <div>
                                        <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                            {x('Monitor', 'Monitor')}
                                        </label>
                                        <select
                                            className="h-10 w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 text-sm text-white focus:border-[color:var(--landing-accent)] focus:outline-none"
                                            value={testForm.data.monitor_id}
                                            onChange={(event) =>
                                                testForm.setData(
                                                    'monitor_id',
                                                    event.target.value,
                                                )
                                            }
                                            disabled={
                                                testMonitors.length === 0 ||
                                                testForm.processing
                                            }
                                        >
                                            {testMonitors.length === 0 ? (
                                                <option value="">
                                                    {x(
                                                        'No approved monitors available',
                                                        'Geen goedgekeurde monitoren beschikbaar',
                                                    )}
                                                </option>
                                            ) : (
                                                testMonitors.map((monitor) => (
                                                    <option
                                                        key={monitor.id}
                                                        value={monitor.id}
                                                    >
                                                        {monitor.label}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                            {x(
                                                'Title (Optional)',
                                                'Titel (optioneel)',
                                            )}
                                        </label>
                                        <input
                                            className="h-10 w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none"
                                            value={testForm.data.title}
                                            onChange={(event) =>
                                                testForm.setData(
                                                    'title',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder={x(
                                                'Manual test alert',
                                                'Handmatige testmelding',
                                            )}
                                            disabled={testForm.processing}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/60">
                                            {x(
                                                'Body (Optional)',
                                                'Bericht (optioneel)',
                                            )}
                                        </label>
                                        <textarea
                                            className="min-h-24 w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white placeholder:text-white/45 focus:border-[color:var(--landing-accent)] focus:outline-none"
                                            value={testForm.data.body}
                                            onChange={(event) =>
                                                testForm.setData(
                                                    'body',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder={x(
                                                'Use this to verify push delivery and dashboard alert flow.',
                                                'Gebruik dit om push delivery en de dashboardmelding te testen.',
                                            )}
                                            disabled={testForm.processing}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className={cn(
                                            buttonVariants({
                                                variant: 'default',
                                                size: 'sm',
                                            }),
                                            'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                        )}
                                        disabled={
                                            testForm.processing ||
                                            testMonitors.length === 0
                                        }
                                    >
                                        {testForm.processing
                                            ? x(
                                                  'Triggering...',
                                                  'Wordt getriggerd...',
                                              )
                                            : x(
                                                  'Create Test Alert',
                                                  'Maak Testmelding',
                                              )}
                                    </button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)] xl:col-span-2">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Price-drop Watchlist', 'Prijsdaling Watchlist')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-white/70">
                                    {x(
                                        'Follow monsters to receive push notifications when approved offers drop in price.',
                                        'Volg monsters om pushmeldingen te krijgen wanneer goedgekeurde aanbiedingen in prijs dalen.',
                                    )}
                                </p>

                                <form
                                    className="grid gap-2 sm:grid-cols-[1fr_auto]"
                                    onSubmit={(event) => {
                                        event.preventDefault();

                                        if (followForm.data.monster_slug === '') {
                                            return;
                                        }

                                        router.post(
                                            route(
                                                'monsters.follow.store',
                                                followForm.data.monster_slug,
                                            ),
                                            { currency: 'EUR' },
                                            {
                                                preserveScroll: true,
                                            },
                                        );
                                    }}
                                >
                                    <select
                                        className="h-10 w-full rounded-md border border-white/15 bg-[color:var(--landing-surface-2)] px-3 text-sm text-white focus:border-[color:var(--landing-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                        value={followForm.data.monster_slug}
                                        onChange={(event) =>
                                            followForm.setData(
                                                'monster_slug',
                                                event.target.value,
                                            )
                                        }
                                        disabled={availableMonsters.length === 0}
                                    >
                                        {availableMonsters.length === 0 ? (
                                            <option value="">
                                                {x(
                                                    'All active monsters are already followed',
                                                    'Alle actieve monsters zijn al gevolgd',
                                                )}
                                            </option>
                                        ) : (
                                            availableMonsters.map((monster) => (
                                                <option
                                                    key={monster.id}
                                                    value={monster.slug}
                                                >
                                                    {monster.label}
                                                </option>
                                            ))
                                        )}
                                    </select>

                                    <button
                                        type="submit"
                                        className={cn(
                                            buttonVariants({
                                                variant: 'default',
                                                size: 'sm',
                                            }),
                                            'w-full bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95 sm:w-auto',
                                        )}
                                        disabled={availableMonsters.length === 0}
                                    >
                                        {x('Follow', 'Volgen')}
                                    </button>
                                </form>

                                {followedPriceDrops.length === 0 ? (
                                    <p className="rounded-lg border border-white/10 bg-[color:var(--landing-surface-2)] px-3 py-2 text-sm text-white/65">
                                        {x(
                                            'No followed monsters yet.',
                                            'Nog geen gevolgde monsters.',
                                        )}
                                    </p>
                                ) : (
                                    <div className="grid gap-3 lg:grid-cols-2">
                                        {followedPriceDrops.map((follow) => {
                                            const monsterSlug =
                                                follow.monster.slug;

                                            return (
                                                <article
                                                    key={follow.id}
                                                    className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                                >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <h3 className="font-medium text-white">
                                                        {follow.monster.name ??
                                                            x('Unknown', 'Onbekend')}
                                                        {follow.monster.size_label
                                                            ? ` (${follow.monster.size_label})`
                                                            : ''}
                                                    </h3>
                                                    {follow.followed_at && (
                                                        <span className="text-xs text-white/55">
                                                            {x(
                                                                'Followed',
                                                                'Gevolgd',
                                                            )}
                                                            :{' '}
                                                            {new Date(
                                                                follow.followed_at,
                                                            ).toLocaleDateString(
                                                                dateLocale,
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                {follow.best_offer ? (
                                                    <div className="mt-2 space-y-1 text-sm text-white/75">
                                                        <p>
                                                            <span className="font-medium text-white">
                                                                {x(
                                                                    'Per can',
                                                                    'Per blik',
                                                                )}
                                                                :
                                                            </span>{' '}
                                                            {formatMoney(
                                                                follow.best_offer
                                                                    .price_per_can_cents,
                                                                follow.best_offer
                                                                    .currency,
                                                            )}{' '}
                                                            ({follow.best_offer.can_count}-
                                                            {x(
                                                                'pack',
                                                                'pack',
                                                            )})
                                                            {follow.best_offer
                                                                .assumed_single_can
                                                                ? ` (${x('assumed', 'aangenomen')})`
                                                                : ''}
                                                        </p>
                                                        <p>
                                                            <span className="font-medium text-white">
                                                                {x(
                                                                    'Total buy',
                                                                    'Totale aankoop',
                                                                )}
                                                                :
                                                            </span>{' '}
                                                            {formatMoney(
                                                                follow.best_offer
                                                                    .effective_total_cents,
                                                                follow.best_offer
                                                                    .currency,
                                                            )}{' '}
                                                            (
                                                            {follow.best_offer
                                                                .site ??
                                                                x(
                                                                    'Unknown store',
                                                                    'Onbekende winkel',
                                                                )}
                                                            )
                                                        </p>
                                                        {follow.best_offer
                                                            .checked_at && (
                                                            <p className="text-xs text-white/55">
                                                                {x(
                                                                    'Checked',
                                                                    'Gecheckt',
                                                                )}
                                                                :{' '}
                                                                {new Date(
                                                                    follow.best_offer.checked_at,
                                                                ).toLocaleString(
                                                                    dateLocale,
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-sm text-white/65">
                                                        {x(
                                                            'No successful snapshot yet for this follow.',
                                                            'Nog geen succesvolle snapshot voor deze follow.',
                                                        )}
                                                    </p>
                                                )}

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {monsterSlug && (
                                                        <Link
                                                            href={route(
                                                                'monsters.show',
                                                                monsterSlug,
                                                            )}
                                                            className={cn(
                                                                buttonVariants({
                                                                    variant: 'outline',
                                                                    size: 'sm',
                                                                }),
                                                                'border-white/20 bg-transparent text-white hover:bg-white/10',
                                                            )}
                                                        >
                                                            {x(
                                                                'Open Monster',
                                                                'Open Monster',
                                                            )}
                                                        </Link>
                                                    )}
                                                    {monsterSlug && (
                                                        <button
                                                            type="button"
                                                            className={cn(
                                                                buttonVariants({
                                                                    variant: 'outline',
                                                                    size: 'sm',
                                                                }),
                                                                'border-rose-400/45 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20',
                                                            )}
                                                            onClick={() =>
                                                                router.delete(
                                                                    route(
                                                                        'monsters.follow.destroy',
                                                                        monsterSlug,
                                                                    ),
                                                                    {
                                                                        data: {
                                                                            currency:
                                                                                'EUR',
                                                                        },
                                                                        preserveScroll:
                                                                            true,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {x(
                                                                'Unfollow',
                                                                'Niet meer volgen',
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-[color:var(--landing-surface)] xl:col-span-3">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('Alert Types', 'Meldingstypes')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarMeter
                                    rows={byType}
                                    emptyLabel={x(
                                        'No alert distribution yet.',
                                        'Nog geen meldingsverdeling.',
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <section>
                        <Card className="border-white/10 bg-[color:var(--landing-surface)]">
                            <CardHeader>
                                <CardTitle className="font-display text-lg text-white">
                                    {x('In-app Alerts', 'In-app Meldingen')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {alerts.data.length === 0 && (
                                    <p className="text-sm text-white/65">
                                        {x('No alerts yet.', 'Nog geen meldingen.')}
                                    </p>
                                )}

                                {alerts.data.map((alert) => (
                                    <article
                                        key={alert.id}
                                        className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <h3 className="font-medium text-white">
                                                {alert.title}
                                            </h3>
                                            <span className="text-xs text-white/55">
                                                {new Date(
                                                    alert.created_at,
                                                ).toLocaleString(dateLocale)}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-white/75">
                                            {alert.body}
                                        </p>
                                        <p className="mt-2 text-xs text-white/60">
                                            {x('Monster:', 'Monster:')}{' '}
                                            {alert.monster.name} •{' '}
                                            {x('Store:', 'Winkel:')}{' '}
                                            {alert.monitor.site.name} •{' '}
                                            {x('Type:', 'Type:')} {alert.type}
                                        </p>
                                        {!alert.read_at && (
                                            <button
                                                type="button"
                                                className={cn(
                                                    buttonVariants({
                                                        variant: 'outline',
                                                        size: 'sm',
                                                    }),
                                                    'mt-3 border-white/20 bg-transparent text-white hover:bg-white/10',
                                                )}
                                                onClick={() =>
                                                    router.post(
                                                        route(
                                                            'admin.alerts.mark-read',
                                                            alert.id,
                                                        ),
                                                        {},
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                {x(
                                                    'Mark Read',
                                                    'Markeer Als Gelezen',
                                                )}
                                            </button>
                                        )}
                                    </article>
                                ))}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
