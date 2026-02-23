import { Button, buttonVariants } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { cn } from '@/lib/utils';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, usePage } from '@inertiajs/react';

export default function Login() {
    const errors = usePage().props.errors as Record<string, string>;

    return (
        <GuestLayout>
            <Head title="Continue with Google" />

            <Card className="border-slate-200 shadow-none">
                <CardHeader className="space-y-2">
                    <CardTitle>Sign in to MonsterIndex</CardTitle>
                    <CardDescription>
                        OAuth-only authentication is enabled. Continue with your
                        Google account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {errors.google && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                            {errors.google}
                        </p>
                    )}
                    <a
                        href={route('auth.google.redirect')}
                        className={cn(
                            buttonVariants({ variant: 'default', size: 'lg' }),
                            'w-full gap-2',
                        )}
                    >
                        <GoogleIcon className="size-4" />
                        Continue with Google
                    </a>
                    <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        disabled
                    >
                        Password login disabled
                    </Button>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2H12z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.9.6-2 1-3.3 1-2.5 0-4.6-1.7-5.4-3.9l-3.2 2.5C5 19.9 8.2 22 12 22z"
            />
            <path
                fill="#4A90E2"
                d="M6.6 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L3.4 7.7C2.8 9 2.4 10.5 2.4 12s.4 3 1 4.3l3.2-2.1z"
            />
            <path
                fill="#FBBC05"
                d="M12 6.1c1.4 0 2.6.5 3.5 1.4l2.6-2.6C16.8 3.7 14.6 2.9 12 2.9 8.2 2.9 5 5 3.4 8.1l3.2 2.5c.8-2.2 2.9-3.9 5.4-3.9z"
            />
        </svg>
    );
}
