import { Toaster } from 'sonner';

export default function AppToaster() {
    return (
        <Toaster
            richColors
            position="top-right"
            theme="system"
            toastOptions={{
                className:
                    '!border !border-[color:var(--border-soft)] !bg-[color:var(--card)] !text-[color:var(--foreground)] !shadow-[var(--shadow-card)]',
            }}
        />
    );
}
