import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'loading-shimmer rounded-[calc(var(--radius)-2px)] bg-[color:var(--surface-3)]',
                className,
            )}
        />
    );
}
