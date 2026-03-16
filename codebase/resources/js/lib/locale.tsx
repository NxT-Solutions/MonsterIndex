import { PageProps } from '@/types';
import { router } from '@inertiajs/react';
import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export type Locale = string;
export type LocaleDirection = 'ltr' | 'rtl';
export type LocaleDefinition = {
    code: Locale;
    name: string;
    nativeName: string;
    dir: LocaleDirection;
    bcp47: string;
};

type TranslationValues = Record<
    string,
    string | number | boolean | null | undefined
>;

type LocaleProviderProps = PropsWithChildren<{
    initialLocale: string;
    fallbackLocale: string;
    cookieName: string;
    supportedLocales: PageProps['locale']['supported'];
}>;

type LocaleContextValue = {
    locale: Locale;
    fallbackLocale: Locale;
    locales: LocaleDefinition[];
    localeTag: string;
    setLocale: (locale: Locale) => void;
    t: (
        key: string,
        values?: TranslationValues,
        fallback?: string,
    ) => string;
    isRtl: boolean;
};

const rawCatalogs = import.meta.glob('../../../lang/*.json', {
    eager: true,
    import: 'default',
}) as Record<string, Record<string, string>>;

const BUILTIN_MESSAGES = Object.fromEntries(
    Object.entries(rawCatalogs).map(([filePath, messages]) => {
        const match = filePath.match(/\/([^/]+)\.json$/);
        const locale = match?.[1] ?? filePath;

        return [locale, messages];
    }),
) satisfies Record<string, Record<string, string>>;

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({
    children,
    initialLocale,
    fallbackLocale,
    cookieName,
    supportedLocales,
}: LocaleProviderProps) {
    const localeRegistry = useMemo<LocaleDefinition[]>(() => {
        return supportedLocales.map((locale) => ({
            code: locale.code,
            name: locale.name,
            nativeName: locale.native_name,
            dir: locale.dir,
            bcp47: locale.bcp47,
        }));
    }, [supportedLocales]);

    const [locale, setLocaleState] = useState<Locale>(() =>
        resolveInitialLocale(initialLocale, fallbackLocale, localeRegistry),
    );

    useEffect(() => {
        const currentLocale =
            localeRegistry.find((entry) => entry.code === locale) ??
            localeRegistry.find((entry) => entry.code === fallbackLocale);

        applyLocaleToDocument(
            currentLocale?.code ?? fallbackLocale,
            currentLocale?.dir ?? 'ltr',
        );
        persistLocale(cookieName, locale);
    }, [cookieName, fallbackLocale, locale, localeRegistry]);

    const value = useMemo<LocaleContextValue>(() => {
        const activeLocale =
            localeRegistry.find((entry) => entry.code === locale) ??
            localeRegistry.find((entry) => entry.code === fallbackLocale) ??
            localeRegistry[0];

        const t = (
            key: string,
            values?: TranslationValues,
            fallback?: string,
        ): string => {
            const localized = lookupMessage(activeLocale?.code ?? locale, key)
                ?? lookupMessage(fallbackLocale, key)
                ?? fallback
                ?? key;

            return interpolate(localized, values);
        };

        return {
            locale: activeLocale?.code ?? fallbackLocale,
            fallbackLocale,
            locales: localeRegistry,
            localeTag: activeLocale?.bcp47 ?? fallbackLocale,
            setLocale: (nextLocale: Locale) => {
                const nextDefinition = localeRegistry.find(
                    (entry) => entry.code === nextLocale,
                );

                if (nextDefinition && nextLocale !== locale) {
                    applyLocaleToDocument(nextDefinition.code, nextDefinition.dir);
                    persistLocale(cookieName, nextDefinition.code);
                    setLocaleState(nextDefinition.code);
                    router.visit(window.location.href, {
                        method: 'get',
                        preserveScroll: true,
                        preserveState: true,
                        replace: true,
                    });
                }
            },
            t,
            isRtl: activeLocale?.dir === 'rtl',
        };
    }, [cookieName, fallbackLocale, locale, localeRegistry]);

    return (
        <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    );
}

export function useLocale(): LocaleContextValue {
    const context = useContext(LocaleContext);

    if (!context) {
        throw new Error('useLocale must be used within LocaleProvider');
    }

    return context;
}

function lookupMessage(locale: string, key: string): string | null {
    return BUILTIN_MESSAGES[locale]?.[key] ?? null;
}

function interpolate(
    template: string,
    values?: TranslationValues,
): string {
    if (!values) {
        return template;
    }

    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = values[key];

        return value === null || value === undefined ? '' : String(value);
    });
}

export function resolveLocaleTag(
    locale: Locale,
    supportedLocales?: LocaleDefinition[],
): string {
    return (
        supportedLocales?.find((entry) => entry.code === locale)?.bcp47 ?? locale
    );
}

function resolveInitialLocale(
    initialLocale: string,
    fallbackLocale: string,
    supportedLocales: LocaleDefinition[],
): Locale {
    const supportedCodes = supportedLocales.map((locale) => locale.code);

    if (supportedCodes.includes(initialLocale)) {
        return initialLocale;
    }

    return fallbackLocale;
}

function persistLocale(name: string, value: string): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function applyLocaleToDocument(locale: string, dir: LocaleDirection): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
}
