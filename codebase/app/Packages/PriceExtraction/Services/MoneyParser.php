<?php

namespace Packages\PriceExtraction\Services;

class MoneyParser
{
    /**
     * @return array{cents: int|null, currency: string}
     */
    public function parse(?string $value, string $defaultCurrency = 'EUR'): array
    {
        if (! $value) {
            return ['cents' => null, 'currency' => $defaultCurrency];
        }

        $currency = $this->detectCurrency($value, $defaultCurrency);

        preg_match('/[-+]?[0-9][0-9., ]*/', $value, $match);

        if (! isset($match[0])) {
            return ['cents' => null, 'currency' => $currency];
        }

        $numeric = preg_replace('/\s+/', '', $match[0]);

        if (! is_string($numeric) || $numeric === '') {
            return ['cents' => null, 'currency' => $currency];
        }

        $lastDot = strrpos($numeric, '.');
        $lastComma = strrpos($numeric, ',');

        $decimalSeparator = null;
        if ($lastDot !== false && $lastComma !== false) {
            $decimalSeparator = $lastDot > $lastComma ? '.' : ',';
        } elseif ($lastComma !== false) {
            $after = strlen($numeric) - $lastComma - 1;
            $decimalSeparator = $after === 2 ? ',' : null;
        } elseif ($lastDot !== false) {
            $after = strlen($numeric) - $lastDot - 1;
            $decimalSeparator = $after === 2 ? '.' : null;
        }

        if ($decimalSeparator) {
            $thousandSeparator = $decimalSeparator === '.' ? ',' : '.';
            $numeric = str_replace($thousandSeparator, '', $numeric);
            $numeric = str_replace($decimalSeparator, '.', $numeric);
        } else {
            $numeric = str_replace([',', '.'], '', $numeric);
        }

        if (! is_numeric($numeric)) {
            return ['cents' => null, 'currency' => $currency];
        }

        $amount = (float) $numeric;
        $cents = (int) round($amount * 100);

        return ['cents' => $cents, 'currency' => $currency];
    }

    private function detectCurrency(string $value, string $default): string
    {
        $uppercase = mb_strtoupper($value);

        if (str_contains($value, '$') || str_contains($uppercase, 'USD')) {
            return 'USD';
        }

        if (str_contains($value, '€') || str_contains($uppercase, 'EUR')) {
            return 'EUR';
        }

        if (str_contains($value, '£') || str_contains($uppercase, 'GBP')) {
            return 'GBP';
        }

        return $default;
    }
}
