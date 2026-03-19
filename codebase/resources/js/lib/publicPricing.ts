export type PublicOfferRow = {
    id: number;
    monster: {
        id: number;
        name: string;
        slug: string;
        size_label: string | null;
    };
    site: string | null;
    domain: string | null;
    product_url: string | null;
    currency: string;
    price_cents: number | null;
    shipping_cents: number | null;
    can_count: number | null;
    price_per_can_cents: number | null;
    effective_total_cents: number;
    effective_total: string;
    checked_at: string | null;
    status: string | null;
    detail_url: string;
    is_following?: boolean;
};

export type TrendingTrackRow = {
    id: number;
    monster: {
        id: number;
        name: string;
        slug: string;
        size_label: string | null;
    };
    site: string | null;
    domain: string | null;
    product_url: string | null;
    currency: string;
    effective_total_cents: number;
    can_count: number | null;
    price_per_can_cents: number | null;
    checked_at: string | null;
    detail_url: string;
};

export function formatMoney(cents: number, currency: string): string {
    return `${currency} ${(cents / 100).toFixed(2)}`;
}

export function effectivePerCanCents(row: {
    effective_total_cents: number;
    can_count: number | null;
    price_per_can_cents: number | null;
}): number | null {
    if (row.price_per_can_cents !== null) {
        return row.price_per_can_cents;
    }

    if (row.can_count !== null && row.can_count > 0) {
        return Math.round(row.effective_total_cents / row.can_count);
    }

    return null;
}

export function volumeLabel(
    canCount: number | null,
    fallback = 'volume unknown',
): string {
    if (canCount === null || canCount <= 0) {
        return fallback;
    }

    return `${canCount}-pack`;
}

export function readableCheckedAt(
    value: string | null,
    locale = 'en-US',
    fallback = 'N/A',
): string {
    if (!value) {
        return fallback;
    }

    return new Date(value).toLocaleString(locale);
}
