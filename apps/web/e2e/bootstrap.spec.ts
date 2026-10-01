import { expect, test } from '@playwright/test';
import { PREVIEW_URL } from './urls';
import {
  cameraState,
  openGame,
  playerPos,
  teleport,
  trackErrors,
  walkUntilBlocked,
} from './helpers';

// Open stretch of Central Street, away from buildings and NPCs.
const STREET = { x: 10, y: 14 };

test('canvas fills the viewport and tracks resizes', async ({ page }) => {
  await openGame(page);
  const viewport = page.viewportSize()!;
  const canvas = page.locator('#game canvas');
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(viewport.width);

  await page.setViewportSize({ width: 600, height: 500 });
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(600);
  await expect.poll(async () => (await cameraState(page)).width).toBe(600);
});

test('keyboard moves the player and the camera follows', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard is a desktop input');
  await openGame(page);
  await teleport(page, STREET.x, STREET.y);
  await page.waitForTimeout(300); // let the camera settle on the new position
  const start = await playerPos(page);
  const camStart = await cameraState(page);
  expect(start.state).toBe('idle');

  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await playerPos(page)).x).toBeGreaterThan(start.x + 60);
  expect((await playerPos(page)).state).toBe('walk');
  await page.keyboard.up('ArrowRight');

  await expect
    .poll(async () => (await cameraState(page)).scrollX)
    .toBeGreaterThan(camStart.scrollX);
  await expect.poll(async () => (await playerPos(page)).state).toBe('idle');
  expect((await playerPos(page)).facing).toBe('right');

  await page.keyboard.down('w');
  await expect.poll(async () => (await playerPos(page)).y).toBeLessThan(start.y - 40);
  await page.keyboard.up('w');
});

test('the tree line at the map edge stops the player', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard to drive the player');
  await openGame(page);
  await teleport(page, 8, 2);
  const stopped = await walkUntilBlocked(page, ['ArrowUp']);
  expect(stopped.body.top).toBeCloseTo(32, 0); // row 0 is trees
  expect(stopped.tile.y).toBe(1);
});

test('touch joystick drag moves the player', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch input');
  await openGame(page);
  await teleport(page, STREET.x, STREET.y);
  const start = await playerPos(page);
  const { height } = page.viewportSize()!;
  const origin = { x: 80, y: height - 150 };

  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    });
  await touch('touchStart', origin.x, origin.y);
  for (let i = 1; i <= 5; i++) await touch('touchMove', origin.x, origin.y - i * 16); // drag up
  await expect.poll(async () => (await playerPos(page)).y).toBeLessThan(start.y - 40);
  expect((await playerPos(page)).facing).toBe('up');

  await touch('touchEnd', 0, 0);
  await expect.poll(async () => (await playerPos(page)).state).toBe('idle');
});

test('production build boots without console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(PREVIEW_URL);
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForTimeout(1500); // let a few frames render
  expect(await page.evaluate(() => window.__LIFE_SHIFT__)).toBeUndefined(); // debug API is dev-only
  expect(errors).toEqual([]);
});

test('dev build runs without console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await openGame(page);
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});
