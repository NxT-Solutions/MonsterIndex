<?php

namespace App\Services\PriceExtraction;

use App\Contracts\SiteAdapter;
use App\Services\PriceExtraction\Adapters\AmazonAdapter;
use App\Services\PriceExtraction\Adapters\TargetAdapter;
use App\Services\PriceExtraction\Adapters\WalmartAdapter;

class SiteAdapterRegistry
{
    /**
     * @var array<string, SiteAdapter>
     */
    private array $adaptersByKey;

    /**
     * @var list<SiteAdapter>
     */
    private array $adapters;

    public function __construct(
        AmazonAdapter $amazonAdapter,
        WalmartAdapter $walmartAdapter,
        TargetAdapter $targetAdapter,
    ) {
        $this->adapters = [$amazonAdapter, $walmartAdapter, $targetAdapter];

        $this->adaptersByKey = [];
        foreach ($this->adapters as $adapter) {
            $this->adaptersByKey[$adapter->key()] = $adapter;
        }
    }

    public function forKey(?string $key): ?SiteAdapter
    {
        if (! $key) {
            return null;
        }

        return $this->adaptersByKey[$key] ?? null;
    }

    public function forDomain(string $domain): ?SiteAdapter
    {
        foreach ($this->adapters as $adapter) {
            if ($adapter->supports($domain)) {
                return $adapter;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    public function adapterKeys(): array
    {
        return array_keys($this->adaptersByKey);
    }
}
