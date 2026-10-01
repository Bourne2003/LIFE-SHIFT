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

export async function teleport(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([tx, ty]) => window.__LIFE_SHIFT__!.teleport({ x: tx!, y: ty! }), [x, y]);
}

/**
 * Holds keys until the player has moved and then stopped (pinned against something solid).
 * Requiring movement first matters on a busy machine: if the game has not run a frame since the
 * key went down, the position is unchanged simply because nothing has happened yet.
 */
export async function walkUntilBlocked(page: Page, keys: string[]) {
  const start = await playerPos(page);
  for (const k of keys) await page.keyboard.down(k);
  let last = start;
  let moved = false;
  await expect
    .poll(
      async () => {
        const now = await playerPos(page);
        moved ||= now.x !== start.x || now.y !== start.y;
        const still = moved && now.x === last.x && now.y === last.y;
        last = now;
        return still;
      },
      { intervals: [400], timeout: 15_000 },
    )
    .toBe(true);
  for (const k of keys) await page.keyboard.up(k);
  return last;
}
