import { buttonVariants } from '@/Components/ui/button';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Link } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

type LandingNavProps = {
    auth: PageProps['auth'];
    brandName: string;
};

export default function LandingNav({ auth, brandName }: LandingNavProps) {
    const { x } = useLocale();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[color:var(--landing-nav-bg)] backdrop-blur-xl">
            <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
                <div className="flex items-center justify-between gap-3">
                    <a
                        href="#top"
                        className="inline-flex items-center gap-3"
                        aria-label={`${brandName} ${x('home', 'home')}`}
                    >
                        <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-md border border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-surface-2)]">
                            <img
                                src="/brand/monsterindex-mark.svg"
                                alt={brandName}
                                className="h-full w-full object-cover"
                            />
                        </span>
                        <div>
                            <p className="font-display text-lg font-semibold text-white">
                                {brandName}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                                {x('Deal Radar', 'Deal Radar')}
                            </p>
                        </div>
                    </a>

                    <div className="flex items-center gap-2 sm:hidden">
                        <ThemeToggle compact inverse className="[&>span]:hidden" />
                        <button
                            type="button"
                            onClick={() => setMobileOpen((state) => !state)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white hover:bg-white/10"
                            aria-expanded={mobileOpen}
                            aria-controls="landing-mobile-nav"
                            aria-label={x('Toggle menu', 'Menu wisselen')}
                        >
                            {mobileOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    <div className="hidden items-center justify-end gap-2 sm:flex">
                        <LanguageSwitcher
                            compact
                            className="[&>span]:hidden sm:[&>span]:inline sm:[&>span]:text-white/55"
                        />
                        <ThemeToggle
                            compact
                            inverse
                            className="[&>span]:hidden sm:[&>span]:inline"
                        />
                        <a
                            href="#live-offers"
                            className={cn(
                                buttonVariants({
                                    variant: 'secondary',
                                    size: 'sm',
                                }),
                                'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                            )}
                        >
                            {x('Browse Deals', 'Bekijk Deals')}
                        </a>
                        {auth.user ? (
                            <>
                                <Link
                                    href={route('dashboard')}
                                    className={cn(
                                        buttonVariants({
                                            variant: 'secondary',
                                            size: 'sm',
                                        }),
                                        'border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                    )}
                                >
                                    {x('Dashboard', 'Dashboard')}
                                </Link>
                                {auth.user.role === 'admin' && (
                                    <Link
                                        href={route('admin.dashboard')}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'default',
                                                size: 'sm',
                                            }),
                                            'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                        )}
                                    >
                                        {x('Admin', 'Admin')}
                                    </Link>
                                )}
                            </>
                        ) : (
                            <Link
                                href={route('login')}
                                className={cn(
                                    buttonVariants({
                                        variant: 'default',
                                        size: 'sm',
                                    }),
                                    'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                )}
                            >
                                {x('Continue with Google', 'Doorgaan met Google')}
                            </Link>
                        )}
                    </div>
                </div>

                {mobileOpen && (
                    <div
                        id="landing-mobile-nav"
                        className="mt-3 space-y-3 rounded-xl border border-white/10 bg-[color:var(--landing-surface)] p-3 sm:hidden"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <LanguageSwitcher compact className="[&>span]:text-white/55" />
                        </div>
                        <div className="grid gap-2">
                            <a
                                href="#live-offers"
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    buttonVariants({
                                        variant: 'secondary',
                                        size: 'sm',
                                    }),
                                    'w-full justify-start border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                )}
                            >
                                {x('Browse Deals', 'Bekijk Deals')}
                            </a>
                            {auth.user ? (
                                <>
                                    <Link
                                        href={route('dashboard')}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                            buttonVariants({
                                                variant: 'secondary',
                                                size: 'sm',
                                            }),
                                            'w-full justify-start border border-white/10 bg-white/5 text-white hover:bg-white/10',
                                        )}
                                    >
                                        {x('Dashboard', 'Dashboard')}
                                    </Link>
                                    {auth.user.role === 'admin' && (
                                        <Link
                                            href={route('admin.dashboard')}
                                            onClick={() => setMobileOpen(false)}
                                            className={cn(
                                                buttonVariants({
                                                    variant: 'default',
                                                    size: 'sm',
                                                }),
                                                'w-full justify-start bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                            )}
                                        >
                                            {x('Admin', 'Admin')}
                                        </Link>
                                    )}
                                </>
                            ) : (
                                <Link
                                    href={route('login')}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        buttonVariants({
                                            variant: 'default',
                                            size: 'sm',
                                        }),
                                        'w-full justify-start bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                                    )}
                                >
                                    {x('Continue with Google', 'Doorgaan met Google')}
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
