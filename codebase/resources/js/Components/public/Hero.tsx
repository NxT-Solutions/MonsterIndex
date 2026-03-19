import { buttonVariants } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';

type HeroProps = {
    copy: {
        name: string;
        tagline: string;
        hero_kicker: string;
        hero_title: string;
        hero_subtitle: string;
        primary_cta_label: string;
        secondary_cta_label: string;
    };
    stats: {
        tracked_monsters: number;
        offers: number;
    };
};

export default function Hero({ copy, stats }: HeroProps) {
    const { t } = useLocale();

    return (
        <section id="top" className="relative overflow-hidden rounded-3xl border border-white/10 bg-[color:var(--landing-surface)] px-6 py-12 sm:px-10 lg:px-12">
            <div className="pointer-events-none absolute -top-20 right-[-90px] h-64 w-64 rounded-full bg-[color:var(--landing-accent-glow)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-[-80px] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--landing-accent)]">
                        {copy.hero_kicker}
                    </p>
                    <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                        {copy.hero_title}
                    </h1>
                    <p className="max-w-2xl font-body text-base text-white/75 sm:text-lg">
                        {copy.hero_subtitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <a
                            href="#live-offers"
                            className={cn(
                                buttonVariants({ variant: 'default', size: 'lg' }),
                                'bg-[color:var(--landing-accent)] text-[#0b1201] hover:brightness-95',
                            )}
                        >
                            {copy.primary_cta_label}
                        </a>
                        <a
                            href="#trending-tracks"
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'lg' }),
                                'border-white/20 bg-transparent text-white hover:bg-white/10',
                            )}
                        >
                            {copy.secondary_cta_label}
                        </a>
                    </div>
                    <p className="font-body text-sm text-white/60">{copy.tagline}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface-2)] p-6">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                            {t('Tracked Monsters')}
                        </p>
                        <p className="mt-3 font-display text-4xl font-bold text-[color:var(--landing-accent)]">
                            {stats.tracked_monsters}
                        </p>
                        <p className="mt-1 font-body text-sm text-white/60">
                            {t('Active products under watch')}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface-2)] p-6">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                            {t('Live Offers')}
                        </p>
                        <p className="mt-3 font-display text-4xl font-bold text-cyan-300">
                            {stats.offers}
                        </p>
                        <p className="mt-1 font-body text-sm text-white/60">
                            {t('Price snapshots for comparison')}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
