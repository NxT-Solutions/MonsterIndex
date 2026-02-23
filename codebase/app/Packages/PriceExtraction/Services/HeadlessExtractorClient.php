<?php

namespace Packages\PriceExtraction\Services;

use Packages\Base\Data\ExtractionResult;
use Symfony\Component\Process\Process;

class HeadlessExtractorClient
{
    public function __construct(private readonly MoneyParser $moneyParser) {}

    /**
     * @param  array<string, mixed>  $selectors
     */
    public function extract(string $url, array $selectors, string $defaultCurrency = 'USD'): ExtractionResult
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

        $priceText = $output['price_text'] ?? null;
        $shippingText = $output['shipping_text'] ?? null;
        $quantityText = $output['quantity_text'] ?? null;

        $price = $this->moneyParser->parse(is_string($priceText) ? $priceText : null, $defaultCurrency);
        if ($price['cents'] === null) {
            return ExtractionResult::failed(
                currency: $price['currency'],
                errorCode: 'HEADLESS_PRICE_NOT_FOUND',
                rawText: is_string($priceText) ? $priceText : null,
            )->withHeadlessFallback();
        }

        $shipping = $this->moneyParser->parse(is_string($shippingText) ? $shippingText : null, $price['currency']);
        $canCount = $this->parseCanCount(is_string($quantityText) ? $quantityText : null);
        $effectiveTotal = $price['cents'] + ($shipping['cents'] ?? 0);
        $pricePerCanCents = ($canCount !== null && $canCount > 0)
            ? (int) round($effectiveTotal / $canCount)
            : null;

        return new ExtractionResult(
            priceCents: $price['cents'],
            shippingCents: $shipping['cents'],
            effectiveTotalCents: $effectiveTotal,
            currency: $price['currency'],
            status: $shippingText && $shipping['cents'] === null ? 'partial' : 'ok',
            rawText: trim(implode(' | ', array_filter([
                is_string($priceText) ? $priceText : null,
                is_string($shippingText) ? $shippingText : null,
                is_string($quantityText) ? $quantityText : null,
            ]))),
            availability: is_string($output['availability'] ?? null) ? $output['availability'] : null,
            usedHeadlessFallback: true,
            canCount: $canCount,
            pricePerCanCents: $pricePerCanCents,
        );
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
