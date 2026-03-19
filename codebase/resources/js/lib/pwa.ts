type NavigatorWithInstallHints = Navigator & {
    standalone?: boolean;
    userAgentData?: {
        platform?: string;
    };
};

export function isStandaloneMode(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const navigatorWithInstallHints = window.navigator as NavigatorWithInstallHints;

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        navigatorWithInstallHints.standalone === true
    );
}

export function isAppleMobileBrowser(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const navigatorWithInstallHints = window.navigator as NavigatorWithInstallHints;
    const platform = navigatorWithInstallHints.userAgentData?.platform
        ?? window.navigator.platform
        ?? '';
    const userAgent = window.navigator.userAgent;
    const isTouchMac = /mac/i.test(platform) && window.navigator.maxTouchPoints > 1;

    return isTouchMac || /iphone|ipad|ipod/i.test(platform) || /iphone|ipad|ipod/i.test(userAgent);
}
