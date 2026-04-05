import { useLocale } from '@/lib/locale';
import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

type DeployVersionStripProps = {
    className?: string;
};

export default function DeployVersionStrip({ className }: DeployVersionStripProps) {
    const { deployVersion } = usePage().props;
    const { t } = useLocale();

    if (deployVersion == null || deployVersion === '') {
        return null;
    }

    return (
        <p
            className={cn('font-body text-xs', className)}
            aria-label={t('Deploy version')}
        >
            <span className="opacity-70">{t('Version')}</span>{' '}
            <span className="tabular-nums opacity-100">{deployVersion}</span>
        </p>
    );
}
