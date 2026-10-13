import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

const locale = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.locale());
const htmlLang = (page: Page) => page.evaluate(() => document.documentElement.lang);

async function clickLanguageButton(page: Page, isMobile: boolean) {
  const { x, y } = await page.evaluate(() => window.__LIFE_SHIFT__!.languageButton());
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

test('starts in Thai with the bundled Thai font loaded', async ({ page }) => {
  await openGame(page);
  expect(await locale(page)).toBe('th');
  expect(await htmlLang(page)).toBe('th');
  const fontReady = await page.evaluate(() =>
    document.fonts.check('18px "Noto Sans Thai"', 'ภาษาไทย'),
  );
  expect(fontReady).toBe(true);
});

test('the language button switches languages and the choice is remembered', async ({
  page,
  isMobile,
}) => {
  await openGame(page);
  await clickLanguageButton(page, isMobile);
  await expect.poll(() => locale(page)).toBe('en');
  expect(await htmlLang(page)).toBe('en');

  await page.reload();
  await openGame(page);
  expect(await locale(page)).toBe('en');

  await clickLanguageButton(page, isMobile);
  await expect.poll(() => locale(page)).toBe('th');
});

test('?lang= in the URL selects the language', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.waitForFunction(() => window.__LIFE_SHIFT__?.isReady() === true);
  expect(await locale(page)).toBe('en');
});
