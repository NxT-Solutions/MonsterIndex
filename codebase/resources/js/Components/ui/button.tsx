import Spinner from '@/Components/ui/spinner';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius)-2px)] text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:pointer-events-none disabled:opacity-60 active:translate-y-px',
    {
        variants: {
            variant: {
                default:
                    'bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[var(--shadow-button)] hover:brightness-105',
                secondary:
                    'bg-[color:var(--secondary)] text-[color:var(--secondary-foreground)] border border-[color:var(--border-soft)] hover:bg-[color:var(--surface-3)]',
                outline:
                    'border border-[color:var(--border-strong)] bg-[color:var(--card)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-3)]',
                ghost:
                    'text-[color:var(--foreground)] hover:bg-[color:var(--surface-veil)]',
                glass:
                    'border border-[color:var(--border-strong)] bg-[color:var(--surface-veil)] text-[color:var(--foreground)] backdrop-blur-xl hover:bg-[color:var(--surface-2)]',
                destructive:
                    'bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)] shadow-[var(--shadow-button)] hover:brightness-105',
                link: 'h-auto rounded-none px-0 py-0 text-[color:var(--primary)] underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-11 px-4 py-2.5',
                sm: 'h-9 px-3 py-2 text-xs',
                lg: 'h-12 px-6 py-3 text-base',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant,
            size,
            asChild = false,
            loading = false,
            children,
            disabled,
            ...props
        },
        ref,
    ) => {
        const Comp = asChild ? Slot : 'button';

        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                data-loading={loading ? 'true' : undefined}
                {...props}
            >
                {loading && <Spinner className="h-3.5 w-3.5" />}
                {children}
            </Comp>
        );
    },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
