type KpiCardProps = {
    label: string;
    value: string | number;
    hint?: string;
    accent?: 'lime' | 'cyan' | 'orange' | 'emerald';
};

const ACCENT_STYLES: Record<
    NonNullable<KpiCardProps['accent']>,
    { color: string; glow: string }
> = {
    lime: {
        color: 'var(--chart-1)',
        glow: 'rgba(200, 255, 31, 0.22)',
    },
    cyan: {
        color: 'var(--chart-2)',
        glow: 'rgba(85, 214, 255, 0.18)',
    },
    orange: {
        color: 'var(--chart-4)',
        glow: 'rgba(255, 207, 102, 0.18)',
    },
    emerald: {
        color: 'var(--chart-3)',
        glow: 'rgba(68, 243, 170, 0.18)',
    },
};

export default function KpiCard({
    label,
    value,
    hint,
    accent = 'lime',
}: KpiCardProps) {
    const tone = ACCENT_STYLES[accent];

    return (
        <article className="relative flex min-h-[10rem] flex-col overflow-hidden rounded-[calc(var(--radius)+8px)] border border-[color:var(--border-soft)] bg-[color:var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
            <div
                className="pointer-events-none absolute inset-x-6 top-0 h-px opacity-80"
                style={{
                    background: `linear-gradient(90deg, transparent, ${tone.color}, transparent)`,
                }}
            />
            <div
                className="pointer-events-none absolute -right-10 top-[-3rem] h-24 w-24 rounded-full blur-3xl"
                style={{ background: tone.glow }}
            />
            <p className="relative font-body text-[11px] uppercase tracking-[0.16em] text-[color:var(--foreground-subtle)]">
                {label}
            </p>
            <p
                className="relative mt-2 font-display text-3xl font-bold"
                style={{ color: tone.color }}
            >
                {value}
            </p>
            {hint && (
                <p className="relative mt-1 font-body text-xs text-[color:var(--foreground-soft)]">
                    {hint}
                </p>
            )}
        </article>
    );
}
