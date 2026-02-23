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

        $price = $this->moneyParser->parse(is_string($priceText) ? $priceText : null, $defaultCurrency);
        if ($price['cents'] === null) {
            return ExtractionResult::failed(
                currency: $price['currency'],
                errorCode: 'HEADLESS_PRICE_NOT_FOUND',
                rawText: is_string($priceText) ? $priceText : null,
            )->withHeadlessFallback();
        }

        $shipping = $this->moneyParser->parse(is_string($shippingText) ? $shippingText : null, $price['currency']);

        return new ExtractionResult(
            priceCents: $price['cents'],
            shippingCents: $shipping['cents'],
            effectiveTotalCents: $price['cents'] + ($shipping['cents'] ?? 0),
            currency: $price['currency'],
            status: $shippingText && $shipping['cents'] === null ? 'partial' : 'ok',
            rawText: trim(implode(' | ', array_filter([
                is_string($priceText) ? $priceText : null,
                is_string($shippingText) ? $shippingText : null,
            ]))),
            availability: is_string($output['availability'] ?? null) ? $output['availability'] : null,
            usedHeadlessFallback: true,
        );
    }
}
