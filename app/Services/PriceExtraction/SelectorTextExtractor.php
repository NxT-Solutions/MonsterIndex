<?php

namespace App\Services\PriceExtraction;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Symfony\Component\CssSelector\CssSelectorConverter;

class SelectorTextExtractor
{
    private CssSelectorConverter $cssToXPath;

    public function __construct()
    {
        $this->cssToXPath = new CssSelectorConverter;
    }

    /**
     * @param  array<string, mixed>  $selector
     */
    public function extract(string $html, array $selector): ?string
    {
        $document = $this->createDocument($html);
        if (! $document) {
            return null;
        }

        $xpath = new DOMXPath($document);

        $css = $selector['css'] ?? null;
        if (is_string($css) && trim($css) !== '') {
            $xpathQuery = $this->cssToXPath->toXPath($css);
            $value = $this->extractFromQuery($xpath, $xpathQuery);
            if ($value !== null) {
                return $value;
            }
        }

        $xpathSelector = $selector['xpath'] ?? null;
        if (is_string($xpathSelector) && trim($xpathSelector) !== '') {
            return $this->extractFromQuery($xpath, $xpathSelector);
        }

        return null;
    }

    private function createDocument(string $html): ?DOMDocument
    {
        if (trim($html) === '') {
            return null;
        }

        $internalErrors = libxml_use_internal_errors(true);

        $document = new DOMDocument('1.0', 'UTF-8');
        $loaded = $document->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NOERROR | LIBXML_NOWARNING);

        libxml_clear_errors();
        libxml_use_internal_errors($internalErrors);

        return $loaded ? $document : null;
    }

    private function extractFromQuery(DOMXPath $xpath, string $query): ?string
    {
        $result = $xpath->query($query);

        if ($result === false || $result->count() === 0) {
            return null;
        }

        $first = $result->item(0);
        if (! $first instanceof DOMElement) {
            return null;
        }

        $text = trim(preg_replace('/\s+/', ' ', $first->textContent) ?? '');

        return $text !== '' ? $text : null;
    }
}
