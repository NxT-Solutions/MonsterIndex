import { buttonVariants } from '@/Components/ui/button';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Link } from '@inertiajs/react';

type LandingNavProps = {
    auth: PageProps['auth'];
    brandName: string;
};

export default function LandingNav({ auth, brandName }: LandingNavProps) {
    const { x } = useLocale();

    return (
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[color:var(--landing-nav-bg)] backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
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

                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                    <LanguageSwitcher
                        compact
                        className="[&>span]:hidden sm:[&>span]:inline sm:[&>span]:text-white/55"
                    />
                    <ThemeToggle
                        compact
                        inverse
                        className="[&>span]:hidden sm:[&>span]:inline"
                    />
                    <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
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
                            <span className="sm:hidden">
                                {x('Deals', 'Deals')}
                            </span>
                            <span className="hidden sm:inline">
                                {x('Browse Deals', 'Bekijk Deals')}
                            </span>
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
                                <span className="sm:hidden">
                                    {x('Google', 'Google')}
                                </span>
                                <span className="hidden sm:inline">
                                    {x(
                                        'Continue with Google',
                                        'Doorgaan met Google',
                                    )}
                                </span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
