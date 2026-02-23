export interface User {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
    role: 'admin' | 'user';
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User | null;
    };
};
