<?php

namespace App\Services\PriceExtraction;

use App\Data\ExtractionResult;

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
            && ((is_string($shippingSelector['css'] ?? null) && trim($shippingSelector['css']) !== '')
                || (is_string($shippingSelector['xpath'] ?? null) && trim($shippingSelector['xpath']) !== ''));

        $status = ($hasShippingSelector && $shippingParsed['cents'] === null)
            ? 'partial'
            : 'ok';

        $effectiveTotal = $priceParsed['cents'] + ($shippingParsed['cents'] ?? 0);

        return new ExtractionResult(
            priceCents: $priceParsed['cents'],
            shippingCents: $shippingParsed['cents'],
            effectiveTotalCents: $effectiveTotal,
            currency: $priceParsed['currency'],
            status: $status,
            rawText: trim(implode(' | ', array_filter([$priceText, $shippingText]))),
        );
    }
}
