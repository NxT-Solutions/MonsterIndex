import {
    Dialog,
    DialogContent,
} from '@/Components/ui/dialog';
import { PropsWithChildren } from 'react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => {},
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    closeable?: boolean;
    onClose: CallableFunction;
}>) {
    const maxWidthClass = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    }[maxWidth];

    return (
        <Dialog
            open={show}
            onOpenChange={(open) => {
                if (!open && closeable) {
                    onClose();
                }
            }}
        >
            <DialogContent className={maxWidthClass}>{children}</DialogContent>
        </Dialog>
    );
}
