import ApplicationLogo from '@/Components/ApplicationLogo';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="auth-theme auth-root flex min-h-screen flex-col items-center bg-[color:var(--background)] px-4 pt-8 text-[color:var(--foreground)] sm:justify-center sm:pt-0">
            <div className="mb-4 flex self-end gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--secondary)] p-1.5 shadow-[0_12px_38px_var(--auth-shadow)] backdrop-blur-xl sm:mb-0 sm:absolute sm:right-6 sm:top-6">
                <LanguageSwitcher compact />
                <ThemeToggle compact />
            </div>
            <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-[0_20px_60px_var(--auth-shadow)] backdrop-blur-xl">
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 rounded-2xl object-cover" />
                </Link>
            </div>

            <div className="mt-6 w-full sm:max-w-md">{children}</div>
        </div>
    );
}
