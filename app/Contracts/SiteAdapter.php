<?php

namespace App\Contracts;

use App\Data\ExtractionResult;

interface SiteAdapter
{
    public function key(): string;

    public function supports(string $domain): bool;

    public function extract(string $html, string $url): ExtractionResult;
}
