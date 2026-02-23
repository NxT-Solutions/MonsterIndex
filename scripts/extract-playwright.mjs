#!/usr/bin/env node

const payload = JSON.parse(process.argv[2] ?? '{}');
const { url, selectors } = payload;

if (!url || typeof url !== 'string') {
  console.error('Missing URL payload.');
  process.exit(1);
}

let playwright;
try {
  playwright = await import('playwright');
} catch (error) {
  console.error('Playwright is not installed. Run: npm install --save-dev playwright');
  process.exit(2);
}

const browser = await playwright.chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 2000 },
  userAgent: 'MonsterIndexBot/1.0 (+https://monsterindex.example)',
});

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  const extractText = async (selector) => {
    if (!selector || typeof selector !== 'object') return null;

    if (selector.css) {
      const locator = page.locator(selector.css).first();
      const count = await locator.count();
      if (count > 0) {
        const text = await locator.textContent();
        if (text && text.trim()) return text.trim();
      }
    }

    if (selector.xpath) {
      const locator = page.locator(`xpath=${selector.xpath}`).first();
      const count = await locator.count();
      if (count > 0) {
        const text = await locator.textContent();
        if (text && text.trim()) return text.trim();
      }
    }

    return null;
  };

  const priceText = await extractText(selectors?.price);
  const shippingText = await extractText(selectors?.shipping);

  console.log(
    JSON.stringify({
      price_text: priceText,
      shipping_text: shippingText,
      availability: null,
    }),
  );
} finally {
  await page.close();
  await browser.close();
}
