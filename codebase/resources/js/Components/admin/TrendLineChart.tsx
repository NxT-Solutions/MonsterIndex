type TrendPoint = {
    label: string;
    value: number;
    secondary?: number;
};

type TrendLineChartProps = {
    points: TrendPoint[];
    primaryLabel: string;
    secondaryLabel?: string;
};

export default function TrendLineChart({
    points,
    primaryLabel,
    secondaryLabel,
}: TrendLineChartProps) {
    const width = 640;
    const height = 180;
    const paddingX = 14;
    const paddingY = 18;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;

    const maxValue = Math.max(
        1,
        ...points.map((point) => point.value),
        ...points.map((point) => point.secondary ?? 0),
    );

    const stepX = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;

    const pointCoordinates = points.map((point, index) => {
        const x = paddingX + index * stepX;
        const y = paddingY + innerHeight - (point.value / maxValue) * innerHeight;

        return { x, y };
    });

    const secondaryCoordinates = points.map((point, index) => {
        const secondary = point.secondary ?? 0;
        const x = paddingX + index * stepX;
        const y = paddingY + innerHeight - (secondary / maxValue) * innerHeight;

        return { x, y };
    });

    const linePath = toLinePath(pointCoordinates);
    const areaPath = toAreaPath(pointCoordinates, height - paddingY);
    const secondaryPath = toLinePath(secondaryCoordinates);

    const marks = points.filter((_, index) => {
        if (points.length <= 4) {
            return true;
        }

        return index % Math.ceil(points.length / 4) === 0 || index === points.length - 1;
    });

    return (
        <div className="space-y-3">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-44 w-full overflow-visible rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)]"
                role="img"
                aria-label={primaryLabel}
            >
                <defs>
                    <linearGradient id="admin-primary-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(157,255,0,0.45)" />
                        <stop offset="100%" stopColor="rgba(157,255,0,0.03)" />
                    </linearGradient>
                </defs>

                <path d={areaPath} fill="url(#admin-primary-area)" />
                <path
                    d={linePath}
                    fill="none"
                    stroke="rgb(157,255,0)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {secondaryLabel && (
                    <path
                        d={secondaryPath}
                        fill="none"
                        stroke="rgb(56,189,248)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeDasharray="5 6"
                    />
                )}
            </svg>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
                <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--landing-accent)]" />
                        {primaryLabel}
                    </span>
                    {secondaryLabel && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                            {secondaryLabel}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {marks.map((mark) => (
                        <span key={mark.label}>{mark.label}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function toLinePath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 0) {
        return '';
    }

    return points
        .map((point, index) =>
            `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
        )
        .join(' ');
}

function toAreaPath(points: Array<{ x: number; y: number }>, baselineY: number): string {
    if (points.length === 0) {
        return '';
    }

    const start = points[0];
    const end = points[points.length - 1];

    const line = toLinePath(points);

    return `${line} L ${end.x.toFixed(2)} ${baselineY.toFixed(
        2,
    )} L ${start.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

