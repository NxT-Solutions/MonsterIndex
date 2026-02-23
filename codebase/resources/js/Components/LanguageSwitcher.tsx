import { buttonVariants } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';

type LanguageSwitcherProps = {
    className?: string;
    compact?: boolean;
};

export default function LanguageSwitcher({
    className,
    compact = false,
}: LanguageSwitcherProps) {
    const { locale, setLocale, x } = useLocale();

    return (
        <div className={cn('inline-flex items-center gap-1.5', className)}>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
                {x('Language', 'Taal')}
            </span>
            <button
                type="button"
                onClick={() => setLocale('en')}
                className={cn(
                    buttonVariants({ variant: 'outline', size: compact ? 'sm' : 'default' }),
                    locale === 'en' && 'bg-slate-900 text-white hover:bg-slate-900',
                )}
                aria-pressed={locale === 'en'}
            >
                EN
            </button>
            <button
                type="button"
                onClick={() => setLocale('nl')}
                className={cn(
                    buttonVariants({ variant: 'outline', size: compact ? 'sm' : 'default' }),
                    locale === 'nl' && 'bg-slate-900 text-white hover:bg-slate-900',
                )}
                aria-pressed={locale === 'nl'}
            >
                NL
            </button>
        </div>
    );
}
