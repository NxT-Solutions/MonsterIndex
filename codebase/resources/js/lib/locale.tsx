import { PageProps } from '@/types';
import enMessages from '@/locales/en.json';
import nlMessages from '@/locales/nl.json';
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
    setLocale: (locale: Locale) => void;
    t: (
        key: string,
        values?: TranslationValues,
        fallback?: string,
    ) => string;
    x: (
        english: string,
        dutch?: string,
        values?: TranslationValues,
    ) => string;
    isRtl: boolean;
};

const BUILTIN_MESSAGES: Record<string, Record<string, string>> = {
    en: enMessages,
    nl: nlMessages,
};

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
        }));
    }, [supportedLocales]);

    const [locale, setLocaleState] = useState<Locale>(() =>
        resolveInitialLocale({
            initialLocale,
            fallbackLocale,
            cookieName,
            supportedLocales: localeRegistry,
        }),
    );

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const currentLocale =
            localeRegistry.find((entry) => entry.code === locale) ??
            localeRegistry.find((entry) => entry.code === fallbackLocale);

        document.documentElement.lang = currentLocale?.code ?? fallbackLocale;
        document.documentElement.dir = currentLocale?.dir ?? 'ltr';
        document.cookie = `${cookieName}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
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
            const localized = lookupMessage(locale, key)
                ?? lookupMessage(fallbackLocale, key)
                ?? fallback
                ?? key;

            return interpolate(localized, values);
        };

        return {
            locale: activeLocale?.code ?? fallbackLocale,
            fallbackLocale,
            locales: localeRegistry,
            setLocale: (nextLocale: Locale) => {
                if (localeRegistry.some((entry) => entry.code === nextLocale)) {
                    setLocaleState(nextLocale);
                }
            },
            t,
            x: (english: string, dutch?: string, values?: TranslationValues) => {
                if (locale === 'nl' && dutch) {
                    return interpolate(
                        lookupMessage('nl', english) ?? dutch,
                        values,
                    );
                }

                return t(english, values, english);
            },
            isRtl: activeLocale?.dir === 'rtl',
        };
    }, [fallbackLocale, locale, localeRegistry]);

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

function resolveInitialLocale({
    initialLocale,
    fallbackLocale,
    cookieName,
    supportedLocales,
}: {
    initialLocale: string;
    fallbackLocale: string;
    cookieName: string;
    supportedLocales: LocaleDefinition[];
}): Locale {
    const supportedCodes = supportedLocales.map((locale) => locale.code);

    if (supportedCodes.includes(initialLocale)) {
        return initialLocale;
    }

    if (typeof document !== 'undefined') {
        const cookieLocale = getCookie(cookieName);
        if (cookieLocale && supportedCodes.includes(cookieLocale)) {
            return cookieLocale;
        }
    }

    if (typeof navigator !== 'undefined') {
        const browserLanguage = navigator.language.toLowerCase().slice(0, 2);
        if (supportedCodes.includes(browserLanguage)) {
            return browserLanguage;
        }
    }

    return fallbackLocale;
}

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const match = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith(`${name}=`));

    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}
