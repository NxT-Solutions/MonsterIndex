import ApplicationLogo from '@/Components/ApplicationLogo';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { buttonVariants } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useMemo, useState } from 'react';

type NavItem = {
    label: string;
    href: string;
    active: boolean;
};

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;
    const { x } = useLocale();

    if (!user) {
        return null;
    }

    const isAdmin = user.role === 'admin';
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = useMemo<NavItem[]>(() => {
        const items: NavItem[] = [
            {
                label: x('Dashboard', 'Dashboard'),
                href: route('dashboard'),
                active: route().current('dashboard'),
            },
        ];

        if (isAdmin) {
            items.push(
                {
                    label: x('Admin', 'Admin'),
                    href: route('admin.dashboard'),
                    active: route().current('admin.dashboard'),
                },
                {
                    label: x('Monsters', 'Monsters'),
                    href: route('admin.monsters.index'),
                    active: route().current('admin.monsters.*'),
                },
                {
                    label: x('Stores', 'Winkels'),
                    href: route('admin.stores.index'),
                    active: route().current('admin.stores.*'),
                },
                {
                    label: x('Monitors', 'Monitoren'),
                    href: route('admin.monitors.index'),
                    active: route().current('admin.monitors.*'),
                },
                {
                    label: x('Alerts', 'Meldingen'),
                    href: route('admin.alerts.index'),
                    active: route().current('admin.alerts.*'),
                },
            );
        }

        return items;
    }, [isAdmin, x]);

    return (
        <div className="admin-root min-h-screen bg-[color:var(--landing-bg)] text-white">
            <nav className="sticky top-0 z-40 border-b border-white/10 bg-[color:var(--landing-nav-bg-strong)] backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <Link href={route('home')} className="inline-flex items-center gap-2">
                            <span className="grid h-10 w-10 place-items-center rounded-md border border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-surface-2)]">
                                <ApplicationLogo className="h-8 w-8 rounded-sm object-cover" />
                            </span>
                            <div className="hidden sm:block">
                                <p className="font-display text-lg font-semibold text-white">
                                    MonsterIndex
                                </p>
                                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                                    {x('Admin Ops', 'Admin Ops')}
                                </p>
                            </div>
                        </Link>
                    </div>

                    <div className="hidden flex-1 items-center justify-center gap-2 lg:flex">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    item.active
                                        ? 'bg-[color:var(--landing-accent)] text-[#0b1201]'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

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
                            {x('Log Out', 'Uitloggen')}
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileOpen((state) => !state)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white lg:hidden"
                            aria-label={x('Toggle menu', 'Menu wisselen')}
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
                        <div className="grid gap-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                        item.active
                                            ? 'bg-[color:var(--landing-accent)] text-[#0b1201]'
                                            : 'bg-white/5 text-white/80 hover:bg-white/10',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {header && (
                <header className="border-b border-white/10 bg-[color:var(--landing-nav-bg)]">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
