<?php

namespace Packages\Base\Data;

class ExtractionResult
{
    public function __construct(
        public readonly ?int $priceCents,
        public readonly ?int $shippingCents,
        public readonly ?int $effectiveTotalCents,
        public readonly string $currency,
        public readonly string $status,
        public readonly ?string $rawText,
        public readonly ?string $availability = null,
        public readonly ?string $errorCode = null,
        public readonly bool $usedHeadlessFallback = false,
        public readonly ?int $canCount = null,
        public readonly ?int $pricePerCanCents = null,
    ) {}

    public static function failed(
        string $currency,
        string $errorCode,
        ?string $rawText = null,
    ): self {
        return new self(
            priceCents: null,
            shippingCents: null,
            effectiveTotalCents: null,
            currency: $currency,
            status: 'failed',
            rawText: $rawText,
            errorCode: $errorCode,
        );
    }

    public function withHeadlessFallback(bool $usedHeadlessFallback = true): self
    {
        return new self(
            priceCents: $this->priceCents,
            shippingCents: $this->shippingCents,
            effectiveTotalCents: $this->effectiveTotalCents,
            currency: $this->currency,
            status: $this->status,
            rawText: $this->rawText,
            availability: $this->availability,
            errorCode: $this->errorCode,
            usedHeadlessFallback: $usedHeadlessFallback,
            canCount: $this->canCount,
            pricePerCanCents: $this->pricePerCanCents,
        );
    }
}
