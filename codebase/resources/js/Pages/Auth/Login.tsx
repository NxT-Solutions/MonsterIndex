import { buttonVariants } from '@/Components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card';
import { useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, usePage } from '@inertiajs/react';

export default function Login() {
    const { x } = useLocale();
    const errors = usePage().props.errors as Record<string, string>;
    const googleRedirectUrl = route('auth.google.redirect');

    const beginGoogleAuth = (event: React.MouseEvent<HTMLAnchorElement>) => {
        // Force a full-page redirect for OAuth, bypassing any client-side link handling.
        event.preventDefault();
        window.location.assign(googleRedirectUrl);
    };

    return (
        <GuestLayout>
            <Head title={x('Login', 'Inloggen')} />

            <Card className="border-[color:var(--border)] bg-[color:var(--card)] shadow-[0_24px_80px_var(--auth-shadow)] backdrop-blur-xl">
                <CardHeader className="space-y-2">
                    <CardTitle className="font-display text-2xl text-[color:var(--card-foreground)]">
                        {x('Sign in to MonsterIndex', 'Meld je aan bij MonsterIndex')}
                    </CardTitle>
                    <CardDescription className="font-body text-sm leading-6 text-[color:var(--muted-foreground)]">
                        {x(
                            'OAuth-only authentication is enabled. Continue with your Google account.',
                            'Alleen OAuth-authenticatie is actief. Ga verder met je Google-account.',
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {errors.google && (
                        <p className="rounded-md border border-[color:var(--auth-error-border)] bg-[color:var(--auth-error-bg)] px-3 py-2 text-sm text-[color:var(--auth-error-foreground)]">
                            {errors.google}
                        </p>
                    )}
                    <a
                        href={googleRedirectUrl}
                        onClick={beginGoogleAuth}
                        className={cn(
                            buttonVariants({ variant: 'default', size: 'lg' }),
                            'w-full gap-2',
                        )}
                    >
                        <GoogleIcon className="size-4" />
                        {x('Continue with Google', 'Doorgaan met Google')}
                    </a>
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
