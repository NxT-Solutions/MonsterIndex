#!/usr/bin/env node

import { existsSync } from 'node:fs';

const payload = JSON.parse(process.argv[2] ?? '{}');
const { url, selectors } = payload;

if (!url || typeof url !== 'string') {
  console.error('Missing URL payload.');
  process.exit(1);
}

let playwright;
try {
  playwright = await import('playwright-core');
} catch (error) {
  console.error('playwright-core is not installed. Run: bun add -d playwright-core');
  process.exit(2);
}

const chromiumPathCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

const browser = await playwright.chromium.launch({
  headless: true,
  executablePath: chromiumPathCandidates.find((candidate) => {
    return Boolean(candidate) && existsSync(candidate);
  }),
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 2000 },
  userAgent: 'MonsterIndexBot/1.0 (+https://monsterindex.example)',
});

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const applyTextSelection = (text, selector) => {
    if (!text || typeof text !== 'string' || !selector || typeof selector !== 'object') {
      return text;
    }

    const normalizedText = normalizeText(text);
    if (!normalizedText) {
      return normalizedText;
    }

    const selection = selector.text_selection;
    if (!selection || typeof selection !== 'object') {
      return normalizedText;
    }

    const selectedText = normalizeText(selection.selected_text);
    const prefix = normalizeText(selection.prefix);
    const suffix = normalizeText(selection.suffix);

    if (prefix || suffix) {
      let start = 0;

      if (prefix) {
        const prefixIndex = normalizedText.indexOf(prefix);
        if (prefixIndex === -1) {
          return selectedText && normalizedText.includes(selectedText)
            ? selectedText
            : normalizedText;
        }

        start = prefixIndex + prefix.length;
      }

      if (suffix) {
        const suffixIndex = normalizedText.indexOf(suffix, start);
        if (suffixIndex === -1) {
          return selectedText && normalizedText.includes(selectedText)
            ? selectedText
            : normalizedText;
        }

        const slice = normalizeText(normalizedText.slice(start, suffixIndex));
        return slice || normalizedText;
      }

      const slice = normalizeText(normalizedText.slice(start));
      return slice || normalizedText;
    }

    if (selectedText && normalizedText.includes(selectedText)) {
      return selectedText;
    }

    return normalizedText;
  };

  const extractSingleText = async (selector) => {
    if (!selector || typeof selector !== 'object') return null;

    if (selector.css) {
      const locator = page.locator(selector.css).first();
      const count = await locator.count();
      if (count > 0) {
        const text = await locator.textContent();
        if (text && text.trim()) return applyTextSelection(text.trim(), selector);
      }
    }

    if (selector.xpath) {
      const locator = page.locator(`xpath=${selector.xpath}`).first();
      const count = await locator.count();
      if (count > 0) {
        const text = await locator.textContent();
        if (text && text.trim()) return applyTextSelection(text.trim(), selector);
      }
    }

    return null;
  };

  const inferJoinWith = (parts) => {
    if (!Array.isArray(parts) || parts.length <= 1) return '';

    if (parts.length === 2) {
      const left = String(parts[0] || '').trim();
      const rightDigits = String(parts[1] || '').replace(/\D+/g, '');
      const leftHasDecimal = /[.,]\d{1,2}\b/.test(left);

      if (!leftHasDecimal && /^\d{2}$/.test(rightDigits)) {
        return '.';
      }
    }

    return '';
  };

  const extractText = async (selector) => {
    if (!selector || typeof selector !== 'object') return null;

    if (Array.isArray(selector.parts) && selector.parts.length > 0) {
      const parts = [];

      for (const part of selector.parts) {
        if (!part || typeof part !== 'object') continue;

        const text = await extractSingleText(part);
        if (text && text.trim()) {
          parts.push(text.trim());
        }
      }

      if (parts.length > 0) {
        const joinWith = typeof selector.join_with === 'string'
          ? selector.join_with
          : inferJoinWith(parts);

        return parts.join(joinWith);
      }
    }

    return extractSingleText(selector);
  };

  const priceText = await extractText(selectors?.price);
  const shippingText = await extractText(selectors?.shipping);
  const quantityText = await extractText(selectors?.quantity);

  console.log(
    JSON.stringify({
      price_text: priceText,
      shipping_text: shippingText,
      quantity_text: quantityText,
      availability: null,
    }),
  );
} finally {
  await page.close();
  await browser.close();
}
