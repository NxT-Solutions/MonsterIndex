<?php

namespace App\Services\PriceExtraction;

use App\Data\ExtractionResult;
use App\Models\Monitor;
use Illuminate\Support\Facades\Http;
use Throwable;

class PriceExtractionService
{
    public function __construct(
        private readonly SiteAdapterRegistry $siteAdapterRegistry,
        private readonly ManualSelectorExtractor $manualSelectorExtractor,
        private readonly HeadlessExtractorClient $headlessExtractorClient,
    ) {}

    public function extract(Monitor $monitor, bool $allowHeadlessFallback = true): ExtractionResult
    {
        $monitor->loadMissing('site');

        $html = $this->fetchHtml($monitor->product_url);
        $defaultCurrency = $monitor->currency ?: 'USD';

        if ($html === null) {
            return $this->maybeFallback(
                monitor: $monitor,
                defaultCurrency: $defaultCurrency,
                allowHeadlessFallback: $allowHeadlessFallback,
                fallbackError: ExtractionResult::failed($defaultCurrency, 'HTTP_FETCH_FAILED'),
            );
        }

        $adapterResult = $this->extractViaAdapter($monitor, $html, $defaultCurrency);
        if ($adapterResult !== null && $adapterResult->status !== 'failed') {
            return $adapterResult;
        }

        $selectorConfig = $monitor->selector_config;
        if (is_array($selectorConfig)) {
            $manualResult = $this->manualSelectorExtractor->extract(
                html: $html,
                selectorConfig: $selectorConfig,
                defaultCurrency: $defaultCurrency,
            );

            if ($manualResult->status !== 'failed') {
                return $manualResult;
            }

            $adapterResult = $manualResult;
        }

        return $this->maybeFallback(
            monitor: $monitor,
            defaultCurrency: $defaultCurrency,
            allowHeadlessFallback: $allowHeadlessFallback,
            fallbackError: $adapterResult ?? ExtractionResult::failed($defaultCurrency, 'PRICE_NOT_FOUND'),
        );
    }

    private function fetchHtml(string $url): ?string
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'MonsterIndexBot/1.0 (+https://monsterindex.example)',
                'Accept-Language' => 'en-US,en;q=0.9',
            ])->timeout(20)
                ->retry(2, 400)
                ->get($url);

            if (! $response->successful()) {
                return null;
            }

            return $response->body();
        } catch (Throwable) {
            return null;
        }
    }

    private function extractViaAdapter(Monitor $monitor, string $html, string $defaultCurrency): ?ExtractionResult
    {
        $adapter = $this->siteAdapterRegistry->forKey($monitor->site?->adapter_key);

        if (! $adapter) {
            $domain = strtolower((string) parse_url($monitor->product_url, PHP_URL_HOST));
            $adapter = $this->siteAdapterRegistry->forDomain($domain);
        }

        if (! $adapter) {
            return null;
        }

        $result = $adapter->extract($html, $monitor->product_url);

        if ($result->currency === '') {
            return new ExtractionResult(
                priceCents: $result->priceCents,
                shippingCents: $result->shippingCents,
                effectiveTotalCents: $result->effectiveTotalCents,
                currency: $defaultCurrency,
                status: $result->status,
                rawText: $result->rawText,
                availability: $result->availability,
                errorCode: $result->errorCode,
                usedHeadlessFallback: $result->usedHeadlessFallback,
            );
        }

        return $result;
    }

    private function maybeFallback(
        Monitor $monitor,
        string $defaultCurrency,
        bool $allowHeadlessFallback,
        ExtractionResult $fallbackError,
    ): ExtractionResult {
        if (! $allowHeadlessFallback || ! is_array($monitor->selector_config)) {
            return $fallbackError;
        }

        return $this->headlessExtractorClient->extract(
            url: $monitor->product_url,
            selectors: $monitor->selector_config,
            defaultCurrency: $defaultCurrency,
        );
    }
}
