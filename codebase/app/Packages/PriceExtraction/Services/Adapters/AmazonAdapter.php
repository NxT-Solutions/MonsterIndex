<?php

namespace Packages\PriceExtraction\Services\Adapters;

use Packages\Base\Contracts\SiteAdapter;
use Packages\Base\Data\ExtractionResult;
use Packages\PriceExtraction\Services\MoneyParser;

class AmazonAdapter implements SiteAdapter
{
    public function __construct(private readonly MoneyParser $moneyParser) {}

    public function key(): string
    {
        return 'amazon';
    }

    public function supports(string $domain): bool
    {
        return str_contains($domain, 'amazon.');
    }

    public function extract(string $html, string $url): ExtractionResult
    {
        $priceText = $this->matchFirst($html, [
            '/id="priceblock_(?:ourprice|dealprice)"[^>]*>\s*([^<]+)/i',
            '/class="a-price-whole"[^>]*>\s*([^<]+)/i',
            '/class="a-offscreen">\s*([^<]*\$[^<]+)/i',
            '/"priceToPay".*?"a-offscreen">\s*([^<]+)/si',
        ]);

        $shippingText = $this->matchFirst($html, [
            '/(?:FREE|\$[0-9.,]+)\s+delivery/i',
        ]);

        $price = $this->moneyParser->parse($priceText, 'USD');
        $shipping = $this->moneyParser->parse($shippingText, $price['currency']);

        if ($price['cents'] === null) {
            return ExtractionResult::failed('USD', 'ADAPTER_PRICE_NOT_FOUND', $priceText);
        }

        return new ExtractionResult(
            priceCents: $price['cents'],
            shippingCents: $shipping['cents'],
            effectiveTotalCents: $price['cents'] + ($shipping['cents'] ?? 0),
            currency: $price['currency'],
            status: $shippingText && $shipping['cents'] === null ? 'partial' : 'ok',
            rawText: trim(implode(' | ', array_filter([$priceText, $shippingText]))),
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
