<?php

namespace Packages\Base\Contracts;

use Packages\Base\Data\ExtractionResult;

interface SiteAdapter
{
    public function key(): string;

    public function supports(string $domain): bool;

    public function extract(string $html, string $url): ExtractionResult;
}
