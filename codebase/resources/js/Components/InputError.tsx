import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p
            {...props}
            className={cn(
                'text-sm text-[color:var(--destructive-foreground)]',
                className,
            )}
        >
            {message}
        </p>
    ) : null;
}
