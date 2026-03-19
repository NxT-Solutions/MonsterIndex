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
            <p className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4 text-sm text-[color:var(--foreground-soft)]">
                {emptyLabel}
            </p>
        );
    }

    const max = Math.max(1, ...rows.map((row) => row.value));
    const gradients = [
        ['var(--chart-1)', 'var(--chart-2)'],
        ['var(--chart-3)', 'var(--chart-2)'],
        ['var(--chart-4)', 'var(--chart-1)'],
        ['var(--chart-5)', 'var(--chart-2)'],
    ];

    return (
        <div className="space-y-3">
            {rows.map((row, index) => {
                const widthPercent = Math.max(
                    8,
                    Math.round((row.value / max) * 100),
                );
                const [startColor, endColor] =
                    gradients[index % gradients.length];

                return (
                    <div key={row.id} className="space-y-1.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <p className="font-medium text-[color:var(--foreground)]">
                                {row.label}
                            </p>
                            <p className="font-semibold text-[color:var(--primary)]">
                                {row.value}
                            </p>
                        </div>
                        <div className="h-2.5 rounded-full bg-[color:var(--surface-veil)]">
                            <div
                                className="h-full rounded-full shadow-[var(--shadow-button)]"
                                style={{
                                    width: `${widthPercent}%`,
                                    background: `linear-gradient(90deg, ${startColor}, ${endColor})`,
                                }}
                            />
                        </div>
                        {row.hint && (
                            <p className="text-xs text-[color:var(--foreground-subtle)]">
                                {row.hint}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
