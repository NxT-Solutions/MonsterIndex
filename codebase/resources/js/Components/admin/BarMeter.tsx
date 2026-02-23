type BarMeterRow = {
    id: number | string;
    label: string;
    value: number;
    hint?: string;
};

type BarMeterProps = {
    rows: BarMeterRow[];
    emptyLabel: string;
};

export default function BarMeter({ rows, emptyLabel }: BarMeterProps) {
    if (rows.length === 0) {
        return (
            <p className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-4 text-sm text-white/65">
                {emptyLabel}
            </p>
        );
    }

    const max = Math.max(1, ...rows.map((row) => row.value));

    return (
        <div className="space-y-3">
            {rows.map((row) => {
                const widthPercent = Math.max(
                    8,
                    Math.round((row.value / max) * 100),
                );

                return (
                    <div key={row.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <p className="font-medium text-white">{row.label}</p>
                            <p className="font-semibold text-[color:var(--landing-accent)]">
                                {row.value}
                            </p>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[color:var(--landing-accent)] to-cyan-300"
                                style={{ width: `${widthPercent}%` }}
                            />
                        </div>
                        {row.hint && (
                            <p className="text-xs text-white/55">{row.hint}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

