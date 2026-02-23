export type PublicOfferRow = {
    id: number;
    monster: {
        name: string;
        slug: string;
        size_label: string | null;
    };
    site: string | null;
    domain: string | null;
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
};

export type TrendingTrackRow = {
    id: number;
    monster: {
        name: string;
        slug: string;
        size_label: string | null;
    };
    site: string | null;
    domain: string | null;
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

export function volumeLabel(canCount: number | null): string {
    if (canCount === null || canCount <= 0) {
        return 'volume unknown';
    }

    return `${canCount}-pack`;
}

export function readableCheckedAt(value: string | null): string {
    if (!value) {
        return 'N/A';
    }

    return new Date(value).toLocaleString();
}
