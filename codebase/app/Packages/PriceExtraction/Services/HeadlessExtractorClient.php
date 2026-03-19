<?php

namespace Packages\PriceExtraction\Services;

use Packages\Base\Data\ExtractionResult;
use Symfony\Component\Process\Process;

class HeadlessExtractorClient
{
    private SelectorTextSelectionApplier $textSelectionApplier;

    public function __construct(
        private readonly MoneyParser $moneyParser,
        ?SelectorTextSelectionApplier $textSelectionApplier = null,
    ) {
        $this->textSelectionApplier = $textSelectionApplier ?? new SelectorTextSelectionApplier;
    }

    /**
     * @param  array<string, mixed>  $selectors
     */
    public function extract(string $url, array $selectors, string $defaultCurrency = 'EUR'): ExtractionResult
    {
        $payload = json_encode([
            'url' => $url,
            'selectors' => $selectors,
        ], JSON_THROW_ON_ERROR);

        $process = new Process([
            'node',
            base_path('scripts/extract-playwright.mjs'),
            $payload,
        ]);

        $process->setTimeout(45);
        $process->run();

        if (! $process->isSuccessful()) {
            return ExtractionResult::failed(
                currency: $defaultCurrency,
                errorCode: 'HEADLESS_PROCESS_FAILED',
                rawText: trim($process->getErrorOutput() ?: $process->getOutput()),
            )->withHeadlessFallback();
        }

        $output = json_decode($process->getOutput(), true);
        if (! is_array($output)) {
            return ExtractionResult::failed(
                currency: $defaultCurrency,
                errorCode: 'HEADLESS_INVALID_OUTPUT',
                rawText: trim($process->getOutput()),
            )->withHeadlessFallback();
        }

        $priceSelector = is_array($selectors['price'] ?? null)
            ? $selectors['price']
            : [];
        $shippingSelector = is_array($selectors['shipping'] ?? null)
            ? $selectors['shipping']
            : [];
        $quantitySelector = is_array($selectors['quantity'] ?? null)
            ? $selectors['quantity']
            : [];
        $priceText = $this->textSelectionApplier->apply(
            is_string($output['price_text'] ?? null) ? $output['price_text'] : null,
            $priceSelector,
        );
        $shippingText = $this->textSelectionApplier->apply(
            is_string($output['shipping_text'] ?? null) ? $output['shipping_text'] : null,
            $shippingSelector,
        );
        $quantityText = $this->textSelectionApplier->apply(
            is_string($output['quantity_text'] ?? null) ? $output['quantity_text'] : null,
            $quantitySelector,
        );
        $manualShippingValue = $this->manualValue($shippingSelector);
        $manualQuantityValue = $this->manualValue($quantitySelector);

        $price = $this->moneyParser->parse(is_string($priceText) ? $priceText : null, $defaultCurrency);
        if ($price['cents'] === null) {
            return ExtractionResult::failed(
                currency: $price['currency'],
                errorCode: 'HEADLESS_PRICE_NOT_FOUND',
                rawText: is_string($priceText) ? $priceText : null,
            )->withHeadlessFallback();
        }

        $shipping = $this->moneyParser->parse(is_string($shippingText) ? $shippingText : null, $price['currency']);
        $manualShipping = $this->moneyParser->parse($manualShippingValue, $price['currency']);
        $shippingCents = $manualShipping['cents'] ?? $shipping['cents'];
        $shippingRaw = $manualShipping['cents'] !== null
            ? $manualShippingValue
            : (is_string($shippingText) ? $shippingText : null);
        $manualCanCount = $this->parseCanCount($manualQuantityValue);
        $canCount = $manualCanCount ?? $this->parseCanCount(is_string($quantityText) ? $quantityText : null);
        $quantityRaw = $manualCanCount !== null
            ? $manualQuantityValue
            : (is_string($quantityText) ? $quantityText : null);
        $effectiveTotal = $price['cents'] + ($shippingCents ?? 0);
        $pricePerCanCents = ($canCount !== null && $canCount > 0)
            ? (int) round($effectiveTotal / $canCount)
            : null;
        $hasShippingInput = $this->hasSelector($shippingSelector) || $manualShippingValue !== null;
        $status = ($hasShippingInput && $shippingCents === null) ? 'partial' : 'ok';

        return new ExtractionResult(
            priceCents: $price['cents'],
            shippingCents: $shippingCents,
            effectiveTotalCents: $effectiveTotal,
            currency: $price['currency'],
            status: $status,
            rawText: trim(implode(' | ', array_filter([
                is_string($priceText) ? $priceText : null,
                $shippingRaw,
                $quantityRaw,
            ]))),
            availability: is_string($output['availability'] ?? null) ? $output['availability'] : null,
            usedHeadlessFallback: true,
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

    /**
     * @param  array<string, mixed>  $selector
     */
    private function manualValue(array $selector): ?string
    {
        if (! is_string($selector['manual_value'] ?? null)) {
            return null;
        }

        $value = trim($selector['manual_value']);

        return $value === '' ? null : $value;
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
