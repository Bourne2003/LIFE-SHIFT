import { expect, test, type Page } from '@playwright/test';
import { weatherForDay } from '@life-shift/shared';
import { dialogueState, openGame, teleport } from './helpers';

const env = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.environment());
const setClock = (page: Page, day: number, minute: number) =>
  page.evaluate(([d, m]) => window.__LIFE_SHIFT__!.setClock(d!, m!), [day, minute]);
const props = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.props());

const firstDay = (weather: 'rain' | 'clear') =>
  Array.from({ length: 100 }, (_, i) => i + 2).find((d) => weatherForDay(d) === weather)!;

test('time passes, and pauses while talking', async ({ page, isMobile }) => {
  await openGame(page);
  const start = await env(page);
  expect(start).toMatchObject({ day: 1, phase: 'morning', weather: 'clear' });
  // Wall-clock based: allow for slow frame rates when browsers run in parallel.
  await expect
    .poll(async () => (await env(page)).minute, { timeout: 10_000 })
    .toBeGreaterThan(start.minute + 1);

  test.skip(isMobile, 'uses the keyboard to talk');
  await teleport(page, { x: 592, y: 320 });
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.nearbyNpc())).toBe('mina');
  await page.keyboard.press('e');
  await expect.poll(() => dialogueState(page)).not.toBeNull();
  const frozen = (await env(page)).minute;
  await page.waitForTimeout(1500);
  expect((await env(page)).minute).toBe(frozen);
});

test('nights are dark and the park lanterns light up', async ({ page }) => {
  await openGame(page);
  expect((await env(page)).nightOpacity).toBe(0);
  expect(await props(page)).toEqual([]);

  await setClock(page, 1, 23 * 60);
  await expect.poll(async () => (await env(page)).phase).toBe('night');
  expect((await env(page)).nightOpacity).toBeGreaterThan(0.5);
  expect(await props(page)).toEqual(['park-lantern-8', 'park-lantern-12']);

  await setClock(page, 2, 12 * 60);
  await expect.poll(async () => (await env(page)).nightOpacity).toBe(0);
  expect(await props(page)).toEqual([]);
});

test('rainy days show rain', async ({ page }) => {
  await openGame(page);
  await setClock(page, firstDay('rain'), 12 * 60);
  await expect.poll(async () => (await env(page)).raining).toBe(true);
  await setClock(page, firstDay('clear'), 12 * 60);
  await expect.poll(async () => (await env(page)).raining).toBe(false);
});

test('world time is saved', async ({ page }) => {
  await openGame(page);
  await setClock(page, 3, 18 * 60);
  await page.reload();
  await openGame(page);
  const after = await env(page);
  expect(after.day).toBe(3);
  expect(after.minute).toBeGreaterThanOrEqual(18 * 60);
  expect(after.phase).toBe('evening');
});
