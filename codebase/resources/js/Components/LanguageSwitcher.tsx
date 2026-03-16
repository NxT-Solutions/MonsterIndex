import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { Check, Languages } from 'lucide-react';

type LanguageSwitcherProps = {
    className?: string;
    compact?: boolean;
};

export default function LanguageSwitcher({
    className,
    compact = false,
}: LanguageSwitcherProps) {
    const { locale, locales, setLocale, t } = useLocale();
    const activeLocale =
        locales.find((entry) => entry.code === locale) ?? locales[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="glass"
                    size={compact ? 'sm' : 'default'}
                    className={cn(
                        'min-w-0 justify-between gap-2',
                        compact ? 'px-3' : 'min-w-[11rem]',
                        className,
                    )}
                    aria-label={t('Language')}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <Languages className="h-4 w-4 text-[color:var(--primary)]" />
                        <span className={cn(compact ? 'sr-only' : 'truncate')}>
                            {t('Language')}
                        </span>
                    </span>
                    <span className="truncate font-semibold uppercase tracking-[0.12em]">
                        {compact
                            ? activeLocale?.code ?? locale
                            : activeLocale?.nativeName ?? locale}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="min-w-[14rem]"
            >
                <DropdownMenuLabel>
                    {t('Language')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={setLocale}
                >
                    {locales.map((entry) => (
                        <DropdownMenuRadioItem
                            key={entry.code}
                            value={entry.code}
                            className="items-start"
                        >
                            <div className="flex w-full items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-[color:var(--foreground)]">
                                        {entry.nativeName}
                                    </p>
                                    <p className="truncate text-xs text-[color:var(--foreground-soft)]">
                                        {entry.name}
                                    </p>
                                </div>
                                {entry.code === locale && (
                                    <Check className="mt-0.5 h-4 w-4 text-[color:var(--primary)]" />
                                )}
                            </div>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                {!compact && locales.length > 2 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-[color:var(--foreground-soft)]">
                            {t('More languages can be added from the locale registry.')}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
