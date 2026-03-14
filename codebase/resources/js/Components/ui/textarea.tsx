import { cn } from '@/lib/utils';
import * as React from 'react';

const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                'flex min-h-[120px] w-full rounded-[calc(var(--radius)-2px)] border border-[color:var(--input)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--foreground)] shadow-[var(--shadow-inset)] placeholder:text-[color:var(--foreground-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export { Textarea };
