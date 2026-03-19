import { Locale, resolveLocaleTag } from '@/lib/locale';

type SupportedValuesIntl = typeof Intl & {
    supportedValuesOf?: (key: 'currency') => string[];
};

const FALLBACK_CURRENCY_CODES = [
    'AED',
    'AFN',
    'ALL',
    'AMD',
    'ANG',
    'AOA',
    'ARS',
    'AUD',
    'AWG',
    'AZN',
    'BAM',
    'BBD',
    'BDT',
    'BGN',
    'BHD',
    'BIF',
    'BMD',
    'BND',
    'BOB',
    'BRL',
    'BSD',
    'BTN',
    'BWP',
    'BYN',
    'BZD',
    'CAD',
    'CDF',
    'CHF',
    'CLP',
    'CNY',
    'COP',
    'CRC',
    'CUC',
    'CUP',
    'CVE',
    'CZK',
    'DJF',
    'DKK',
    'DOP',
    'DZD',
    'EGP',
    'ERN',
    'ETB',
    'EUR',
    'FJD',
    'FKP',
    'GBP',
    'GEL',
    'GHS',
    'GIP',
    'GMD',
    'GNF',
    'GTQ',
    'GYD',
    'HKD',
    'HNL',
    'HRK',
    'HTG',
    'HUF',
    'IDR',
    'ILS',
    'INR',
    'IQD',
    'IRR',
    'ISK',
    'JMD',
    'JOD',
    'JPY',
    'KES',
    'KGS',
    'KHR',
    'KMF',
    'KPW',
    'KRW',
    'KWD',
    'KYD',
    'KZT',
    'LAK',
    'LBP',
    'LKR',
    'LRD',
    'LSL',
    'LYD',
    'MAD',
    'MDL',
    'MGA',
    'MKD',
    'MMK',
    'MNT',
    'MOP',
    'MRU',
    'MUR',
    'MVR',
    'MWK',
    'MXN',
    'MYR',
    'MZN',
    'NAD',
    'NGN',
    'NIO',
    'NOK',
    'NPR',
    'NZD',
    'OMR',
    'PAB',
    'PEN',
    'PGK',
    'PHP',
    'PKR',
    'PLN',
    'PYG',
    'QAR',
    'RON',
    'RSD',
    'RUB',
    'RWF',
    'SAR',
    'SBD',
    'SCR',
    'SDG',
    'SEK',
    'SGD',
    'SHP',
    'SLE',
    'SLL',
    'SOS',
    'SRD',
    'SSP',
    'STN',
    'SVC',
    'SYP',
    'SZL',
    'THB',
    'TJS',
    'TMT',
    'TND',
    'TOP',
    'TRY',
    'TTD',
    'TWD',
    'TZS',
    'UAH',
    'UGX',
    'USD',
    'UYU',
    'UZS',
    'VES',
    'VND',
    'VUV',
    'WST',
    'XAF',
    'XCD',
    'XCG',
    'XDR',
    'XOF',
    'XPF',
    'XSU',
    'YER',
    'ZAR',
    'ZMW',
    'ZWG',
    'ZWL',
];

const PINNED_CODES = ['EUR', 'USD', 'GBP'] as const;

type CurrencyOption = {
    code: string;
    label: string;
};

export function currencyOptionsForLocale(locale: Locale): CurrencyOption[] {
    const codes = resolveCurrencyCodes();
    const displayLocale = resolveLocaleTag(locale);
    const displayNames =
        typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
            ? new Intl.DisplayNames([displayLocale], { type: 'currency' })
            : null;

    return sortCurrencyCodes(codes).map((code) => {
        const name = displayNames?.of(code);

        return {
            code,
            label: name ? `${code} - ${name}` : code,
        };
    });
}

function resolveCurrencyCodes(): string[] {
    if (typeof Intl === 'undefined') {
        return FALLBACK_CURRENCY_CODES;
    }

    const supportedValuesIntl = Intl as SupportedValuesIntl;
    if (typeof supportedValuesIntl.supportedValuesOf !== 'function') {
        return FALLBACK_CURRENCY_CODES;
    }

    const codes = supportedValuesIntl.supportedValuesOf('currency')
        .map((code) => code.toUpperCase())
        .filter((code) => /^[A-Z]{3}$/.test(code));

    return codes.length > 0 ? codes : FALLBACK_CURRENCY_CODES;
}

function sortCurrencyCodes(codes: string[]): string[] {
    const uniqueCodes = Array.from(
        new Set(codes.map((code) => code.toUpperCase())),
    );

    uniqueCodes.sort((left, right) => {
        const leftPinnedIndex = PINNED_CODES.indexOf(
            left as (typeof PINNED_CODES)[number],
        );
        const rightPinnedIndex = PINNED_CODES.indexOf(
            right as (typeof PINNED_CODES)[number],
        );

        if (leftPinnedIndex !== -1 && rightPinnedIndex !== -1) {
            return leftPinnedIndex - rightPinnedIndex;
        }

        if (leftPinnedIndex !== -1) {
            return -1;
        }

        if (rightPinnedIndex !== -1) {
            return 1;
        }

        return left.localeCompare(right);
    });

    return uniqueCodes;
}
