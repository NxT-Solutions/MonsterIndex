<?php

namespace App\Services\PriceExtraction\Adapters;

use App\Contracts\SiteAdapter;
use App\Data\ExtractionResult;
use App\Services\PriceExtraction\MoneyParser;

class TargetAdapter implements SiteAdapter
{
    public function __construct(private readonly MoneyParser $moneyParser) {}

    public function key(): string
    {
        return 'target';
    }

    public function supports(string $domain): bool
    {
        return str_contains($domain, 'target.com');
    }

    public function extract(string $html, string $url): ExtractionResult
    {
        $priceText = $this->matchFirst($html, [
            '/"current_retail"\s*:\s*([0-9.]+)/i',
            '/"formatted_current_price"\s*:\s*"([^\"]+)"/i',
            '/itemprop="price"[^>]*content="([0-9.]+)"/i',
        ]);

        $price = $this->moneyParser->parse($priceText, 'USD');

        if ($price['cents'] === null) {
            return ExtractionResult::failed('USD', 'ADAPTER_PRICE_NOT_FOUND', $priceText);
        }

        return new ExtractionResult(
            priceCents: $price['cents'],
            shippingCents: null,
            effectiveTotalCents: $price['cents'],
            currency: $price['currency'],
            status: 'ok',
            rawText: $priceText,
        );
    }

    /**
     * @param  list<string>  $patterns
     */
    private function matchFirst(string $html, array $patterns): ?string
    {
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html, $matches) === 1) {
                return trim($matches[1] ?? $matches[0]);
            }
        }

        return null;
    }
}
