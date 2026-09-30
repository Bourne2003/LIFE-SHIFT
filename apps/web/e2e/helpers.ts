import { expect, type Page } from '@playwright/test';

/** Collects uncaught exceptions and console.error output for the lifetime of the page. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

export async function openGame(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForFunction(() => window.__LIFE_SHIFT__?.isReady() === true);
}

export function playerPos(page: Page) {
  return page.evaluate(() => window.__LIFE_SHIFT__!.player());
}

export function cameraState(page: Page) {
  return page.evaluate(() => window.__LIFE_SHIFT__!.camera());
}
