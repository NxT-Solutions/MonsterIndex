import ApplicationLogo from '@/Components/ApplicationLogo';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-[color:var(--background)] px-4 pt-8 text-[color:var(--foreground)] sm:justify-center sm:pt-0">
            <div className="mb-3 flex self-end gap-2 sm:mb-0 sm:absolute sm:right-6 sm:top-6">
                <LanguageSwitcher compact />
                <ThemeToggle compact />
            </div>
            <div>
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-gray-500" />
                </Link>
            </div>

            <div className="mt-6 w-full sm:max-w-md">{children}</div>
        </div>
    );
}
