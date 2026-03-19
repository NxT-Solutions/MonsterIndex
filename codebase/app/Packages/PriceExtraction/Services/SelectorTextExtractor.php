<?php

namespace Packages\PriceExtraction\Services;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Symfony\Component\CssSelector\CssSelectorConverter;

class SelectorTextExtractor
{
    private CssSelectorConverter $cssToXPath;
    private SelectorTextSelectionApplier $textSelectionApplier;

    public function __construct(?SelectorTextSelectionApplier $textSelectionApplier = null)
    {
        $this->cssToXPath = new CssSelectorConverter;
        $this->textSelectionApplier = $textSelectionApplier ?? new SelectorTextSelectionApplier;
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

        $parts = $selector['parts'] ?? null;
        if (is_array($parts) && $parts !== []) {
            $collected = [];
            foreach ($parts as $part) {
                if (! is_array($part)) {
                    continue;
                }

                $text = $this->extractSingle($xpath, $part);
                if ($text !== null && $text !== '') {
                    $collected[] = $text;
                }
            }

            if ($collected !== []) {
                $joinWith = $this->resolveJoinWith($selector, $collected);

                return trim(implode($joinWith, $collected));
            }
        }

        return $this->extractSingle($xpath, $selector);
    }

    /**
     * @param  array<string, mixed>  $selector
     */
    private function extractSingle(DOMXPath $xpath, array $selector): ?string
    {
        $css = $selector['css'] ?? null;
        if (is_string($css) && trim($css) !== '') {
            $xpathQuery = $this->cssToXPath->toXPath($css);
            $value = $this->extractFromQuery($xpath, $xpathQuery);
            if ($value !== null) {
                return $this->textSelectionApplier->apply($value, $selector);
            }
        }

        $xpathSelector = $selector['xpath'] ?? null;
        if (is_string($xpathSelector) && trim($xpathSelector) !== '') {
            return $this->textSelectionApplier->apply(
                $this->extractFromQuery($xpath, $xpathSelector),
                $selector,
            );
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $selector
     * @param  list<string>  $parts
     */
    private function resolveJoinWith(array $selector, array $parts): string
    {
        $joinWith = $selector['join_with'] ?? null;
        if (is_string($joinWith)) {
            return $joinWith;
        }

        if (count($parts) === 2) {
            $left = trim($parts[0]);
            $right = preg_replace('/\D+/', '', trim($parts[1])) ?? '';
            $leftHasDecimal = preg_match('/[.,]\d{1,2}\b/', $left) === 1;

            if (! $leftHasDecimal && preg_match('/^\d{2}$/', $right) === 1) {
                return '.';
            }
        }

        return '';
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
