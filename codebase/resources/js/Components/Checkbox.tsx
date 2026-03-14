import { Checkbox as UiCheckbox } from '@/Components/ui/checkbox';
import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <UiCheckbox
            {...props}
            className={className}
        />
    );
}
