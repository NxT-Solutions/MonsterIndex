type PriceHistoryPoint = {
    label: string;
    value: number;
    timestamp: number | null;
};

type PriceHistoryChartProps = {
    points: PriceHistoryPoint[];
    lineLabel: string;
    emptyLabel: string;
    ariaLabel: string;
    valueFormatter: (value: number) => string;
};

export default function PriceHistoryChart({
    points,
    lineLabel,
    emptyLabel,
    ariaLabel,
    valueFormatter,
}: PriceHistoryChartProps) {
    if (points.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)] p-6 text-sm text-white/60">
                {emptyLabel}
            </div>
        );
    }

    const width = 780;
    const height = 220;
    const paddingX = 14;
    const paddingY = 20;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const minValue = Math.min(...points.map((point) => point.value));
    const maxValue = Math.max(...points.map((point) => point.value));
    const range = Math.max(1, maxValue - minValue);
    const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;
    const yForValue = (value: number): number => {
        const normalized = (value - minValue) / range;

        return paddingY + innerHeight - normalized * innerHeight;
    };

    const coordinates = points.map((point, index) => {
        const x =
            points.length > 1
                ? paddingX + index * stepX
                : paddingX + innerWidth / 2;
        const y = yForValue(point.value);

        return { x, y };
    });

    const linePath = toLinePath(coordinates);
    const areaPath = toAreaPath(coordinates, height - paddingY);
    const marks = points.filter((_, index) => {
        if (points.length <= 6) {
            return true;
        }

        return index % Math.ceil(points.length / 6) === 0 || index === points.length - 1;
    });
    const yTicks = [maxValue, minValue + range / 2, minValue];

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                <span>{`High: ${valueFormatter(maxValue)}`}</span>
                <span>{`Low: ${valueFormatter(minValue)}`}</span>
            </div>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-56 w-full overflow-visible rounded-xl border border-white/10 bg-[color:var(--landing-surface-2)]"
                role="img"
                aria-label={ariaLabel}
            >
                <defs>
                    <linearGradient id="public-price-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(87,250,207,0.38)" />
                        <stop offset="100%" stopColor="rgba(87,250,207,0.02)" />
                    </linearGradient>
                </defs>

                {yTicks.map((tick, index) => {
                    const y = yForValue(tick);

                    return (
                        <g key={`tick-${index}`}>
                            <line
                                x1={paddingX}
                                y1={y}
                                x2={width - paddingX}
                                y2={y}
                                stroke="rgba(255,255,255,0.09)"
                                strokeDasharray="4 4"
                            />
                            <text
                                x={paddingX + 4}
                                y={Math.max(y - 6, 12)}
                                fill="rgba(255,255,255,0.55)"
                                fontSize="10"
                            >
                                {valueFormatter(Math.round(tick))}
                            </text>
                        </g>
                    );
                })}

                <path d={areaPath} fill="url(#public-price-area)" />
                <path
                    d={linePath}
                    fill="none"
                    stroke="rgb(87,250,207)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {coordinates.map((coordinate, index) => (
                    <circle
                        key={`point-${index}`}
                        cx={coordinate.x}
                        cy={coordinate.y}
                        r="3.2"
                        fill="rgb(87,250,207)"
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth="1"
                    />
                ))}
            </svg>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--landing-accent)]" />
                    {lineLabel}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                    {marks.map((mark, index) => (
                        <span key={`${mark.label}-${index}`}>
                            {mark.label} · {valueFormatter(mark.value)}
                        </span>
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

    return `${line} L ${end.x.toFixed(2)} ${baselineY.toFixed(2)} L ${start.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}
