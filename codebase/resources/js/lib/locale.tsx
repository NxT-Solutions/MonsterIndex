import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export type Locale = 'en' | 'nl';

const STORAGE_KEY = 'monsterindex_locale';

type LocaleContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    x: (english: string, dutch: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: PropsWithChildren) {
    const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale());

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, locale);
        }

        if (typeof document !== 'undefined') {
            document.documentElement.lang = locale;
        }
    }, [locale]);

    const value = useMemo<LocaleContextValue>(() => {
        return {
            locale,
            setLocale: (nextLocale: Locale) => {
                setLocaleState(nextLocale);
            },
            x: (english: string, dutch: string) =>
                locale === 'nl' ? dutch : english,
        };
    }, [locale]);

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

function resolveInitialLocale(): Locale {
    if (typeof window === 'undefined') {
        return 'en';
    }

    const queryLang = new URLSearchParams(window.location.search).get('lang');
    if (queryLang === 'en' || queryLang === 'nl') {
        return queryLang;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'nl') {
        return stored;
    }

    const browserLang = window.navigator.language.toLowerCase();
    if (browserLang.startsWith('nl')) {
        return 'nl';
    }

    return 'en';
}
