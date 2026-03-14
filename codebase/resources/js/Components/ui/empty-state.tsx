import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function EmptyState({
    title,
    description,
    icon,
    action,
    className,
}: {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'glass-card flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-[calc(var(--radius)+10px)] border border-[color:var(--border-soft)] px-6 py-10 text-center',
                className,
            )}
        >
            {icon && (
                <div className="grid h-12 w-12 place-items-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-veil)] text-[color:var(--primary)]">
                    {icon}
                </div>
            )}
            <div className="space-y-2">
                <p className="font-display text-xl font-semibold text-[color:var(--foreground)]">
                    {title}
                </p>
                {description && (
                    <p className="mx-auto max-w-xl text-sm text-[color:var(--foreground-soft)]">
                        {description}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}
