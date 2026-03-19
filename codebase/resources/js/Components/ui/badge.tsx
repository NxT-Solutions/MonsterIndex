import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
    {
        variants: {
            variant: {
                default:
                    'border-[color:var(--border-strong)] bg-[color:var(--surface-veil)] text-[color:var(--foreground)]',
                accent:
                    'border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] text-[color:var(--primary-foreground)]',
                secondary:
                    'border-[color:var(--border-soft)] bg-[color:var(--secondary)] text-[color:var(--secondary-foreground)]',
                destructive:
                    'border-[color:var(--destructive-soft)] bg-[color:var(--destructive-soft)] text-[color:var(--destructive-foreground)]',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    );
}
