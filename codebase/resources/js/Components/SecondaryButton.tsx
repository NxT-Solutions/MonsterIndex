import { Button } from '@/Components/ui/button';
import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button
            {...props}
            type={type}
            variant="secondary"
            className={className}
            disabled={disabled}
        >
            {children}
        </Button>
    );
}
