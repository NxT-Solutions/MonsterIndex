import { Button } from '@/Components/ui/button';
import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button
            {...props}
            className={className}
            disabled={disabled}
        >
            {children}
        </Button>
    );
}
