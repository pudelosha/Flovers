import { test as base, expect } from '@playwright/test';

// The actual built site is served locally. No API/page responses are fabricated.
// Block before dispatch, including third-party images/fonts/analytics.
const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const blocked = [];
    const errors = [];
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://127.0.0.1:4173') return route.continue();
      blocked.push(url.origin + url.pathname);
      return route.abort('blockedbyclient');
    });
    page.on('pageerror', error => errors.push(error.message));
    await use(page);
    await testInfo.attach('external-requests-blocked', { body: JSON.stringify(blocked), contentType: 'application/json' });
    expect(errors, 'Uncaught browser exceptions').toEqual([]);
    expect(blocked, 'The public smoke journeys must require only local assets').toEqual([]);
  },
});

async function navigate(page, testInfo, name) {
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('#mobile-menu').getByRole('link', { name, exact: true }).click();
  } else {
    await page.locator('.nav-desktop').getByRole('link', { name, exact: true }).click();
  }
}

test('homepage renders real assets', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/en');
  await expect(page.getByRole('heading', { name: 'Flovers', exact: true })).toBeVisible();
  await expect(page.locator('.brand-name')).toHaveText('Flovers');
  // Hidden mobile/desktop variants and offscreen lazy screenshots are not
  // supposed to load on initial entry. Check every rendered hero image.
  const images = page.locator('.home-hero img:visible');
  expect(await images.count()).toBeGreaterThan(0);
  await expect.poll(() => images.evaluateAll(nodes => nodes.filter(n => !n.complete || n.naturalWidth === 0).length)).toBe(0);
});

test('main navigation reaches documentation schemas and FAQ', async ({ page }, testInfo) => {
  await page.goto('/en');
  for (const [name, path] of [['Documentation', 'docs'], ['Schemas', 'schemas'], ['FAQ', 'faq']]) {
    await navigate(page, testInfo, name);
    await expect(page).toHaveURL(`/en/${path}`);
    await expect(page.locator('main').getByRole('heading').first()).toBeVisible();
    await expect(page.locator('main.main')).not.toHaveText('');
  }
  await navigate(page, testInfo, 'Home');
  await expect(page).toHaveURL('/en');
});

test('language selector preserves route and translates navigation', async ({ page }) => {
  await page.goto('/en/docs');
  await page.getByRole('button', { name: 'Language selection' }).click();
  await page.getByRole('menu').getByRole('button', { name: 'Polish', exact: true }).click();
  await expect(page).toHaveURL('/pl/docs');
  await expect(page.locator('.lang-trigger')).toContainText('Polski');
  await page.locator('.lang-trigger').click();
  await page.getByRole('menu').getByRole('button', { name: 'Angielski', exact: true }).click();
  await expect(page).toHaveURL('/en/docs');
  await expect(page.locator('.lang-trigger')).toContainText('English');
});

test('public footer pages and store availability', async ({ page }) => {
  await page.goto('/en');
  // Store destinations are intentionally not configured in the current site.
  const stores = page.locator('.home-store-badge');
  await expect(stores).toHaveCount(2);
  for (const store of await stores.all()) {
    await expect(store).toHaveAttribute('aria-disabled', 'true');
    await expect(store).not.toHaveAttribute('href');
  }
  for (const [name, path] of [['Terms', 'terms'], ['Privacy Policy', 'privacy-policy'], ['Contact', 'contact']]) {
    await page.locator('footer').getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(`/en/${path}`);
    await expect(page.locator('main').getByRole('heading').first()).toBeVisible();
  }
  await expect(page.locator('#contact-email')).toBeVisible();
  await expect(page.locator('#contact-email')).toHaveAttribute('type', 'email');
});

test('responsive layout keeps navigation and content inside viewport', async ({ page }, testInfo) => {
  await page.goto('/en');
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    await expect(page.locator('.nav-desktop')).toBeHidden();
  } else {
    await expect(page.locator('.nav-desktop')).toBeVisible();
  }
  for (const path of ['/en', '/en/docs', '/en/schemas', '/en/faq']) {
    await page.goto(path);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main.main')).toBeVisible();
  }
});
