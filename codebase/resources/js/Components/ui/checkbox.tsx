import { cn } from '@/lib/utils';
import * as React from 'react';

const Checkbox = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<'input'>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        type="checkbox"
        className={cn(
            'h-4 w-4 rounded border-[color:var(--input)] bg-[color:var(--surface-2)] text-[color:var(--primary)] focus:ring-[color:var(--ring)] focus:ring-offset-[color:var(--background)]',
            className,
        )}
        {...props}
    />
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
