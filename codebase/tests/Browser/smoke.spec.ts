import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const MONSTER_SLUG = 'monster-energy-original-500ml';

async function expectNoAccessibilityViolations(page: Page) {
    const results = await new AxeBuilder({ page })
        .exclude('[data-sonner-toaster]')
        .analyze();

    expect(results.violations).toEqual([]);
}

async function loginAs(
    page: Page,
    role: 'admin' | 'contributor',
    redirect: string,
) {
    await page.goto(
        `/__smoke/login?role=${role}&redirect=${encodeURIComponent(redirect)}`,
        { waitUntil: 'networkidle' },
    );
}

test('landing page supports locale switching and cookie persistence', async ({
    page,
}) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(
        page.getByRole('heading', {
            name: 'Find your next Monster deal before it disappears.',
        }),
    ).toBeVisible();

    await expectNoAccessibilityViolations(page);

    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitemradio', { name: /Nederlands/i }).click();

    await expect(
        page.getByRole('heading', {
            name: 'Vind je volgende Monster-deal voordat die verdwijnt.',
        }),
    ).toBeVisible();

    await expect
        .poll(() => page.evaluate(() => document.documentElement.lang))
        .toBe('nl');

    await page.reload({ waitUntil: 'networkidle' });

    await expect
        .poll(() => page.evaluate(() => document.documentElement.lang))
        .toBe('nl');
    await expect
        .poll(() => page.evaluate(() => document.cookie))
        .toContain('monsterindex_locale=nl');
});

test('login page is accessible and stays OAuth-only', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await expect(
        page.getByRole('heading', { name: 'Sign in to MonsterIndex' }),
    ).toBeVisible();
    await expect(
        page.getByRole('link', { name: 'Continue with Google' }),
    ).toBeVisible();

    await expectNoAccessibilityViolations(page);
});

test('public monster detail page is accessible', async ({ page }) => {
    await page.goto(`/monsters/${MONSTER_SLUG}`, { waitUntil: 'networkidle' });

    await expect(
        page.getByRole('heading', { name: /Monster Energy Original 500ml/i }),
    ).toBeVisible();

    await expectNoAccessibilityViolations(page);
});

test('contributor monitor workspace loads through smoke auth', async ({
    page,
}) => {
    await loginAs(page, 'contributor', '/contribute/monitors');

    await expect(
        page.getByRole('heading', { name: 'My Monitor Proposals' }),
    ).toBeVisible();

    await expectNoAccessibilityViolations(page);
});

test('admin dashboard loads through smoke auth', async ({ page }) => {
    await loginAs(page, 'admin', '/admin');

    await expect(
        page.getByRole('heading', { name: 'Control Center' }),
    ).toBeVisible();

    await expectNoAccessibilityViolations(page);
});
