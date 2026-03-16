import { Button } from '@/Components/ui/button';
import { useLocale } from '@/lib/locale';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';

type ThemeToggleProps = {
    className?: string;
    compact?: boolean;
    inverse?: boolean;
};

export default function ThemeToggle({
    className,
    compact = false,
    inverse = false,
}: ThemeToggleProps) {
    const { isDark, toggleTheme } = useTheme();
    const { t } = useLocale();

    const label = isDark
        ? t('Switch to light mode')
        : t('Switch to dark mode');

    return (
        <Button
            type="button"
            onClick={toggleTheme}
            variant={inverse ? 'glass' : 'outline'}
            size={compact ? 'sm' : 'default'}
            className={cn('gap-2', className)}
            aria-label={label}
            title={label}
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className={cn(compact && 'sr-only')}>
                {isDark ? t('Light') : t('Dark')}
            </span>
        </Button>
    );
}
