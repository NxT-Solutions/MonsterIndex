export interface User {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
    role: 'admin' | 'user';
    roles: string[];
    permissions: string[];
    can: {
        admin_access: boolean;
        monitor_submit: boolean;
        monitor_manage_any: boolean;
        monitor_review: boolean;
        monster_suggestion_submit: boolean;
        monster_suggestion_review: boolean;
        stores_manage: boolean;
        monsters_manage: boolean;
        monster_follow: boolean;
        contributor_alert_view: boolean;
        contributor_alert_mark_read: boolean;
        push_test: boolean;
    };
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User | null;
    };
    locale: {
        current: string;
        fallback: string;
        cookie_name: string;
        supported: Array<{
            code: string;
            name: string;
            native_name: string;
            dir: 'ltr' | 'rtl';
            bcp47: string;
        }>;
    };
    adminReview?: {
        pending_monitors: number;
        pending_suggestions: number;
    } | null;
    contributorAlerts?: {
        unread: number;
        total: number;
    } | null;
    push?: {
        vapid_configured: boolean;
        subscriptions_count: number;
        has_active_subscription: boolean;
    } | null;
    deployVersion?: string | null;
};
