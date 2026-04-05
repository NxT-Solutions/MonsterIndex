import DeployVersionStrip from '@/Components/DeployVersionStrip';
import ApplicationLogo from '@/Components/ApplicationLogo';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { buttonVariants } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useMemo, useState } from 'react';

type NavItem = {
    label: string;
    href: string;
    active: boolean;
    badge?: number;
};

type LayoutProps = PageProps<{
    adminReview?: {
        pending_monitors: number;
        pending_suggestions: number;
    } | null;
    contributorAlerts?: {
        unread: number;
        total: number;
    } | null;
}>;

function badgeClasses(count: number): string {
    return count > 0
        ? 'border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-accent)] text-[#0b1201]'
        : 'border-white/15 bg-white/5 text-white/70';
}

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const page = usePage<LayoutProps>();
    const user = page.props.auth.user;
    const { t } = useLocale();

    if (!user) {
        return null;
    }

    const isAdmin = user.can.admin_access;
    const reviewCounts = page.props.adminReview ?? {
        pending_monitors: 0,
        pending_suggestions: 0,
    };
    const contributorAlerts = page.props.contributorAlerts ?? {
        unread: 0,
        total: 0,
    };

    const [mobileOpen, setMobileOpen] = useState(false);

    const primaryNavItems = useMemo<NavItem[]>(() => {
        const items: NavItem[] = [
            {
                label: t('Dashboard'),
                href: route('dashboard'),
                active: route().current('dashboard'),
            },
        ];

        if (!isAdmin && user.can.monitor_submit) {
            items.push({
                label: t('My Monitors'),
                href: route('contribute.monitors.index'),
                active: route().current('contribute.monitors.*'),
            });
        }

        if (!isAdmin && user.can.monster_suggestion_submit) {
            items.push({
                label: t('Suggestions'),
                href: route('contribute.suggestions.index'),
                active: route().current('contribute.suggestions.*'),
            });
        }

        if (!isAdmin && user.can.monster_follow) {
            items.push({
                label: t('Following'),
                href: route('contribute.follows.index'),
                active: route().current('contribute.follows.*'),
            });
        }

        if (!isAdmin && user.can.contributor_alert_view) {
            items.push({
                label: t('Alerts'),
                href: route('contribute.alerts.index'),
                active: route().current('contribute.alerts.*'),
                badge: contributorAlerts.unread,
            });
        }

        return items;
    }, [
        isAdmin,
        contributorAlerts.unread,
        user.can.monitor_submit,
        user.can.monster_suggestion_submit,
        user.can.monster_follow,
        user.can.contributor_alert_view,
        t,
    ]);

    const adminNavItems = useMemo<NavItem[]>(() => {
        if (!isAdmin) {
            return [];
        }

        return [
            {
                label: t('Admin Overview'),
                href: route('admin.dashboard'),
                active: route().current('admin.dashboard'),
            },
            {
                label: t('Monsters'),
                href: route('admin.monsters.index'),
                active: route().current('admin.monsters.*'),
            },
            {
                label: t('Stores'),
                href: route('admin.stores.index'),
                active: route().current('admin.stores.*'),
            },
            {
                label: t('Monitors'),
                href: route('admin.monitors.index'),
                active: route().current('admin.monitors.*'),
            },
            {
                label: t('Alerts'),
                href: route('admin.alerts.index'),
                active: route().current('admin.alerts.*'),
            },
        ];
    }, [isAdmin, t]);

    const reviewNavItems = useMemo<NavItem[]>(() => {
        const items: NavItem[] = [];

        if (user.can.monitor_review) {
            items.push({
                label: t('Review Monitors'),
                href: route('admin.review.monitors.index'),
                active: route().current('admin.review.monitors.*'),
                badge: reviewCounts.pending_monitors,
            });
        }

        if (user.can.monster_suggestion_review) {
            items.push({
                label: t('Review Suggestions'),
                href: route('admin.review.suggestions.index'),
                active: route().current('admin.review.suggestions.*'),
                badge: reviewCounts.pending_suggestions,
            });
        }

        return items;
    }, [
        user.can.monitor_review,
        user.can.monster_suggestion_review,
        reviewCounts.pending_monitors,
        reviewCounts.pending_suggestions,
        t,
    ]);

    return (
        <div className="admin-root min-h-screen bg-[color:var(--landing-bg)] text-white">
            <nav className="sticky top-0 z-40 border-b border-white/10 bg-[color:var(--landing-nav-bg-strong)]/95 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <Link href={route('home')} className="inline-flex items-center gap-2">
                        <span className="grid h-10 w-10 place-items-center rounded-md border border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-surface-2)]">
                            <ApplicationLogo className="h-8 w-8 rounded-sm object-cover" />
                        </span>
                        <div className="hidden sm:block">
                            <p className="font-display text-lg font-semibold text-white">MonsterIndex</p>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                                {t('Admin Ops')}
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2">
                        <LanguageSwitcher
                            compact
                            className="hidden sm:inline-flex [&>span]:text-white/55"
                        />
                        <ThemeToggle compact inverse className="hidden sm:inline-flex" />
                        <div className="hidden text-right sm:block">
                            <p className="max-w-[180px] truncate text-sm font-medium text-white">
                                {user.name}
                            </p>
                            <p className="max-w-[180px] truncate text-xs text-white/55">
                                {user.email}
                            </p>
                        </div>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'border-white/20 bg-transparent text-white hover:bg-white/10',
                            )}
                        >
                            {t('Log Out')}
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileOpen((state) => !state)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white lg:hidden"
                            aria-label={t('Toggle menu')}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                className="h-5 w-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d={
                                        mobileOpen
                                            ? 'M6 18L18 6M6 6l12 12'
                                            : 'M4 6h16M4 12h16M4 18h16'
                                    }
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="hidden border-t border-white/10 lg:block">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-2">
                            {primaryNavItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                                        item.active
                                            ? 'bg-[color:var(--landing-accent)] text-[#0b1201]'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white',
                                    )}
                                >
                                    <span>{item.label}</span>
                                    {item.badge !== undefined && (
                                        <span
                                            className={cn(
                                                'inline-flex min-w-6 items-center justify-center rounded-full border px-1.5 py-0.5 text-xs font-semibold',
                                                badgeClasses(item.badge),
                                            )}
                                        >
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            ))}

                            {adminNavItems.length > 0 && (
                                <details className="group relative [&_summary::-webkit-details-marker]:hidden">
                                    <summary className="inline-flex list-none cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium whitespace-nowrap text-white/85 transition-colors hover:bg-white/10">
                                        <span>{t('Admin Tools')}</span>
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            stroke="currentColor"
                                            className="h-4 w-4 transition-transform group-open:rotate-180"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.8"
                                                d="M6 8l4 4 4-4"
                                            />
                                        </svg>
                                    </summary>
                                    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-60 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--popover)] p-2 shadow-[var(--shadow-dialog)]">
                                        {adminNavItems.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    'flex items-center rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
                                                    item.active
                                                        ? 'bg-[color:var(--landing-accent)] text-[#0b1201]'
                                                        : 'text-[color:var(--popover-foreground)] hover:bg-[color:var(--surface-3)] hover:text-[color:var(--foreground)]',
                                                )}
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>

                        {reviewNavItems.length > 0 && (
                            <div className="flex min-w-fit shrink-0 items-center gap-2">
                                {reviewNavItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                                            item.active
                                                ? 'border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-accent)] text-[#0b1201]'
                                                : 'border-white/15 bg-white/5 text-white/85 hover:bg-white/10',
                                        )}
                                    >
                                        <span>{item.label}</span>
                                        <span
                                            className={cn(
                                                'inline-flex min-w-6 items-center justify-center rounded-full border px-1.5 py-0.5 text-xs font-semibold',
                                                badgeClasses(item.badge ?? 0),
                                            )}
                                        >
                                            {item.badge ?? 0}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {mobileOpen && (
                    <div className="border-t border-white/10 px-4 py-3 lg:hidden">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-white">{user.name}</p>
                                <p className="text-xs text-white/55">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher compact className="[&>span]:text-white/55" />
                                <ThemeToggle compact inverse />
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <div className="grid gap-2">
                                {primaryNavItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                            'inline-flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                            item.active
                                                ? 'bg-[color:var(--landing-accent)] text-[#0b1201]'
                                                : 'bg-white/5 text-white/80 hover:bg-white/10',
                                        )}
                                    >
                                        <span>{item.label}</span>
                                        {item.badge !== undefined && (
                                            <span
                                                className={cn(
                                                    'inline-flex min-w-6 items-center justify-center rounded-full border px-1.5 py-0.5 text-xs font-semibold',
                                                    badgeClasses(item.badge),
                                                )}
                                            >
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>

                            {adminNavItems.length > 0 && (
                                <div className="rounded-md border border-white/10 bg-white/5 p-2">
                                    <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
                                        {t('Admin Tools')}
                                    </p>
                                    <div className="grid gap-1">
                                        {adminNavItems.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileOpen(false)}
                                                className={cn(
                                                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                                    item.active
                                                        ? 'bg-[color:var(--landing-accent)] text-[#0b1201]'
                                                        : 'text-white/80 hover:bg-white/10',
                                                )}
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {reviewNavItems.length > 0 && (
                                <div className="rounded-md border border-white/10 bg-white/5 p-2">
                                    <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
                                        {t('Review Queue')}
                                    </p>
                                    <div className="grid gap-1">
                                        {reviewNavItems.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileOpen(false)}
                                                className={cn(
                                                    'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                                    item.active
                                                        ? 'bg-[color:var(--landing-accent)] text-[#0b1201]'
                                                        : 'text-white/80 hover:bg-white/10',
                                                )}
                                            >
                                                <span>{item.label}</span>
                                                <span
                                                    className={cn(
                                                        'inline-flex min-w-6 items-center justify-center rounded-full border px-1.5 py-0.5 text-xs font-semibold',
                                                        badgeClasses(item.badge ?? 0),
                                                    )}
                                                >
                                                    {item.badge ?? 0}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {header && (
                <header className="border-b border-white/10 bg-[color:var(--landing-nav-bg)]">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div>
                </header>
            )}

            <main>{children}</main>
            <DeployVersionStrip className="border-t border-white/10 px-4 py-3 text-center text-white/45 sm:px-6 lg:px-8" />
        </div>
    );
}
