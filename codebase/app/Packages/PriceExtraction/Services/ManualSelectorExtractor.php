<?php

namespace Packages\PriceExtraction\Services;

use Packages\Base\Data\ExtractionResult;

class ManualSelectorExtractor
{
    public function __construct(
        private readonly SelectorTextExtractor $selectorTextExtractor,
        private readonly MoneyParser $moneyParser,
    ) {}

    /**
     * @param  array<string, mixed>  $selectorConfig
     */
    public function extract(string $html, array $selectorConfig, string $defaultCurrency = 'USD'): ExtractionResult
    {
        $priceSelector = $selectorConfig['price'] ?? null;
        if (! is_array($priceSelector)) {
            return ExtractionResult::failed($defaultCurrency, 'PRICE_SELECTOR_MISSING');
        }

        $priceText = $this->selectorTextExtractor->extract($html, $priceSelector);
        $priceParsed = $this->moneyParser->parse($priceText, $defaultCurrency);

        if ($priceParsed['cents'] === null) {
            return ExtractionResult::failed(
                currency: $priceParsed['currency'],
                errorCode: 'PRICE_NOT_FOUND',
                rawText: $priceText,
            );
        }

        $shippingSelector = $selectorConfig['shipping'] ?? null;
        $shippingText = is_array($shippingSelector)
            ? $this->selectorTextExtractor->extract($html, $shippingSelector)
            : null;

        $shippingParsed = $this->moneyParser->parse($shippingText, $priceParsed['currency']);

        $hasShippingSelector = is_array($shippingSelector)
            && $this->hasSelector($shippingSelector);

        $status = ($hasShippingSelector && $shippingParsed['cents'] === null)
            ? 'partial'
            : 'ok';

        $effectiveTotal = $priceParsed['cents'] + ($shippingParsed['cents'] ?? 0);
        $quantitySelector = $selectorConfig['quantity'] ?? null;
        $quantityText = is_array($quantitySelector)
            ? $this->selectorTextExtractor->extract($html, $quantitySelector)
            : null;
        $canCount = $this->parseCanCount($quantityText);
        $pricePerCanCents = ($canCount !== null && $canCount > 0)
            ? (int) round($effectiveTotal / $canCount)
            : null;

        return new ExtractionResult(
            priceCents: $priceParsed['cents'],
            shippingCents: $shippingParsed['cents'],
            effectiveTotalCents: $effectiveTotal,
            currency: $priceParsed['currency'],
            status: $status,
            rawText: trim(implode(' | ', array_filter([$priceText, $shippingText, $quantityText]))),
            canCount: $canCount,
            pricePerCanCents: $pricePerCanCents,
        );
    }

    /**
     * @param  array<string, mixed>  $selector
     */
    private function hasSelector(array $selector): bool
    {
        if (is_string($selector['css'] ?? null) && trim($selector['css']) !== '') {
            return true;
        }

        if (is_string($selector['xpath'] ?? null) && trim($selector['xpath']) !== '') {
            return true;
        }

        $parts = $selector['parts'] ?? null;
        if (! is_array($parts)) {
            return false;
        }

        foreach ($parts as $part) {
            if (! is_array($part)) {
                continue;
            }

            if ((is_string($part['css'] ?? null) && trim($part['css']) !== '')
                || (is_string($part['xpath'] ?? null) && trim($part['xpath']) !== '')) {
                return true;
            }
        }

        return false;
    }

    private function parseCanCount(?string $value): ?int
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $normalized = trim(preg_replace('/\s+/', ' ', $value) ?? '');
        if ($normalized === '') {
            return null;
        }

        $patterns = [
            '/(\d{1,4})\s*(?:pack|pk|ct|count|cans?|x)\b/i',
            '/(?:pack|pk|ct|count|cans?)\s*(?:of\s*)?(\d{1,4})\b/i',
            '/\b(\d{1,4})\b/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $normalized, $matches) !== 1) {
                continue;
            }

            $count = isset($matches[1]) ? (int) $matches[1] : 0;
            if ($count > 0 && $count <= 500) {
                return $count;
            }
        }

        return null;
    }
}
