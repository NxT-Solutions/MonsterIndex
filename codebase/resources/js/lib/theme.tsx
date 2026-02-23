import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'monsterindex_theme';

type ThemeContextValue = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
    const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, theme);
        }

        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.classList.toggle('dark', theme === 'dark');
            root.style.colorScheme = theme;
        }
    }, [theme]);

    const value = useMemo<ThemeContextValue>(() => {
        return {
            theme,
            isDark: theme === 'dark',
            setTheme: (nextTheme: Theme) => setThemeState(nextTheme),
            toggleTheme: () =>
                setThemeState((currentTheme) =>
                    currentTheme === 'dark' ? 'light' : 'dark',
                ),
        };
    }, [theme]);

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }

    return context;
}

function resolveInitialTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'dark';
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}
