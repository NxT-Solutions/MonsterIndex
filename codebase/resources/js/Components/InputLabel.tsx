import { cn } from '@/lib/utils';
import { LabelHTMLAttributes } from 'react';

export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { value?: string }) {
    return (
        <label
            {...props}
            className={cn(
                'block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]',
                className,
            )}
        >
            {value ? value : children}
        </label>
    );
}
