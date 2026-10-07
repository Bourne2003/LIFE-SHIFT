import { expect, test } from '@playwright/test';
import { TILE_SIZE } from '@life-shift/shared';
import { PREVIEW_URL } from './urls';
import { cameraState, openGame, playerPos, trackErrors } from './helpers';

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

test('player cannot leave the world', async ({ page, isMobile }) => {
  test.slow(); // walks corner to corner
  test.skip(isMobile, 'uses keyboard to drive the player');
  await openGame(page);
  const world = await page.evaluate(() => window.__LIFE_SHIFT__!.world());

  const holdUntilStopped = async (keys: string[]) => {
    for (const k of keys) await page.keyboard.down(k);
    // Walking stops changing position once the body is pinned against both edges.
    let last = await playerPos(page);
    await expect
      .poll(
        async () => {
          const now = await playerPos(page);
          const still = now.x === last.x && now.y === last.y;
          last = now;
          return still;
        },
        { intervals: [500], timeout: 15_000 },
      )
      .toBe(true);
    for (const k of keys) await page.keyboard.up(k);
    return last.body;
  };

  const topLeft = await holdUntilStopped(['ArrowLeft', 'ArrowUp']);
  expect(topLeft.left).toBeCloseTo(0, 0);
  expect(topLeft.top).toBeCloseTo(0, 0);

  const bottomRight = await holdUntilStopped(['d', 's']);
  expect(bottomRight.right).toBeCloseTo(world.width, 0);
  expect(bottomRight.bottom).toBeCloseTo(world.height, 0);
});

test('player collides with world obstacles', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard to drive the player');
  await openGame(page);
  const obstacleLeft = 22 * TILE_SIZE;

  await page.keyboard.down('ArrowRight');
  let last = await playerPos(page);
  await expect
    .poll(
      async () => {
        const now = await playerPos(page);
        const still = now.x === last.x;
        last = now;
        return still;
      },
      { intervals: [250], timeout: 8_000 },
    )
    .toBe(true);
  await page.keyboard.up('ArrowRight');

  expect(last.body.right).toBeCloseTo(obstacleLeft, 0);
});

test('touch joystick drag moves the player', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch input');
  await openGame(page);
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
