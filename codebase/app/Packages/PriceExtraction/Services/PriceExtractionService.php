<?php

namespace Packages\PriceExtraction\Services;

use Packages\Base\Data\ExtractionResult;
use App\Models\Monitor;
use Illuminate\Support\Facades\Http;
use Throwable;

class PriceExtractionService
{
    public function __construct(
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

            return $this->maybeFallback(
                monitor: $monitor,
                defaultCurrency: $defaultCurrency,
                allowHeadlessFallback: $allowHeadlessFallback,
                fallbackError: $manualResult,
            );
        }

        return $this->maybeFallback(
            monitor: $monitor,
            defaultCurrency: $defaultCurrency,
            allowHeadlessFallback: $allowHeadlessFallback,
            fallbackError: ExtractionResult::failed($defaultCurrency, 'SELECTOR_CONFIG_MISSING'),
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
