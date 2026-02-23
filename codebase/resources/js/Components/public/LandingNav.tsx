import { buttonVariants } from '@/Components/ui/button';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
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
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(8,12,12,0.82)] backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <a
                    href="#top"
                    className="inline-flex items-center gap-3"
                    aria-label={`${brandName} ${x('home', 'home')}`}
                >
                    <span className="grid h-9 w-9 place-items-center rounded-md border border-[color:var(--landing-accent-soft)] bg-[color:var(--landing-surface-2)] text-[color:var(--landing-accent)]">
                        M
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

                <div className="flex items-center gap-2">
                    <LanguageSwitcher
                        compact
                        className="mr-1 [&>span]:text-white/55"
                    />
                    <a
                        href="#live-offers"
                        className={cn(
                            buttonVariants({ variant: 'secondary', size: 'sm' }),
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
                                buttonVariants({ variant: 'default', size: 'sm' }),
                                'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                            )}
                        >
                            {x('Continue with Google', 'Doorgaan met Google')}
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
