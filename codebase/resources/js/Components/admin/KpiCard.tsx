type KpiCardProps = {
    label: string;
    value: string | number;
    hint?: string;
    accent?: 'lime' | 'cyan' | 'orange' | 'emerald';
};

const ACCENT_CLASS: Record<NonNullable<KpiCardProps['accent']>, string> = {
    lime: 'text-[color:var(--landing-accent)]',
    cyan: 'text-cyan-300',
    orange: 'text-orange-300',
    emerald: 'text-emerald-300',
};

export default function KpiCard({
    label,
    value,
    hint,
    accent = 'lime',
}: KpiCardProps) {
    return (
        <article className="rounded-2xl border border-white/10 bg-[color:var(--landing-surface)] p-4 shadow-[0_10px_26px_rgba(0,0,0,.24)] sm:p-5">
            <p className="font-body text-[11px] uppercase tracking-[0.16em] text-white/55">
                {label}
            </p>
            <p
                className={`mt-2 font-display text-3xl font-bold ${ACCENT_CLASS[accent]}`}
            >
                {value}
            </p>
            {hint && <p className="mt-1 font-body text-xs text-white/60">{hint}</p>}
        </article>
    );
}

