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
    };
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User | null;
    };
};
