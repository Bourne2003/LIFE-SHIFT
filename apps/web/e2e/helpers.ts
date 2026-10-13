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

export function npcState(page: Page) {
  return page.evaluate(() => window.__LIFE_SHIFT__!.npcs());
}

export function nearbyNpc(page: Page) {
  return page.evaluate(() => window.__LIFE_SHIFT__!.nearbyNpc());
}

export function dialogueState(page: Page) {
  return page.evaluate(() => window.__LIFE_SHIFT__!.dialogue());
}

export function questLog(page: Page) {
  return page.evaluate(() => window.__LIFE_SHIFT__!.quests());
}

/** Places the player's feet at a world position (dev-only test hook). */
export function teleport(page: Page, feet: { x: number; y: number }) {
  return page.evaluate(({ x, y }) => window.__LIFE_SHIFT__!.teleport(x, y), feet);
}
