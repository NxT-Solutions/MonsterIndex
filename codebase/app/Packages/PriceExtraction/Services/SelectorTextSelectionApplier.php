<?php

namespace Packages\PriceExtraction\Services;

class SelectorTextSelectionApplier
{
    /**
     * @param  array<string, mixed>  $selector
     */
    public function apply(?string $text, array $selector): ?string
    {
        if (! is_string($text)) {
            return null;
        }

        $normalizedText = $this->normalize($text);
        if ($normalizedText === '') {
            return null;
        }

        $selection = $selector['text_selection'] ?? null;
        if (! is_array($selection)) {
            return $normalizedText;
        }

        $selectedText = $this->normalize($selection['selected_text'] ?? null);
        $prefix = $this->normalize($selection['prefix'] ?? null);
        $suffix = $this->normalize($selection['suffix'] ?? null);

        $between = $this->sliceBetween($normalizedText, $prefix, $suffix);
        if ($between !== null) {
            return $between;
        }

        if ($selectedText !== '' && mb_strpos($normalizedText, $selectedText) !== false) {
            return $selectedText;
        }

        return $normalizedText;
    }

    private function normalize(mixed $value): string
    {
        return trim((string) preg_replace('/\s+/', ' ', (string) $value));
    }

    private function sliceBetween(string $text, string $prefix, string $suffix): ?string
    {
        if ($prefix === '' && $suffix === '') {
            return null;
        }

        $start = 0;

        if ($prefix !== '') {
            $prefixPosition = mb_strpos($text, $prefix);
            if ($prefixPosition === false) {
                return null;
            }

            $start = $prefixPosition + mb_strlen($prefix);
        }

        $slice = '';

        if ($suffix !== '') {
            $suffixPosition = mb_strpos($text, $suffix, $start);
            if ($suffixPosition === false) {
                return null;
            }

            $slice = mb_substr($text, $start, $suffixPosition - $start);
        } else {
            $slice = mb_substr($text, $start);
        }

        $slice = trim($slice);

        return $slice === '' ? null : $slice;
    }
}
