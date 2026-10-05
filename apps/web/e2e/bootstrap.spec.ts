import { expect, test } from '@playwright/test';
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

test('Thai locale updates document accessibility metadata', async ({ page }) => {
  await page.goto('/?lang=th');
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  await expect(page.locator('#game')).toHaveAttribute('aria-label', 'เกม LIFE SHIFT');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'LIFE SHIFT — ใช้ชีวิตของคุณ เปลี่ยนแปลงโลก',
  );
});

test('language control persists the selected locale', async ({ page }) => {
  await page.goto('/?lang=en');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.locator('#language-control').click();
  await expect(page).toHaveURL(/lang=th/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  await expect(page.locator('#game')).toHaveAttribute('aria-label', 'เกม LIFE SHIFT');
  await expect(page.locator('#language-control')).toHaveText('ภาษา: ไทย');
  expect(await page.evaluate(() => localStorage.getItem('life-shift.locale'))).toBe('th');
});

test('interaction control is available on every device', async ({ page }) => {
  await openGame(page);
  const control = page.locator('#interact-control');
  await expect(control).toBeVisible();
  await control.click();
});

test('first quest can be completed from exploration to discovery', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard movement for deterministic quest travel');
  await openGame(page);
  expect(await page.evaluate(() => window.__LIFE_SHIFT__!.quest().state)).toBe('explore');

  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(
      async () => {
        const player = await playerPos(page);
        return Math.hypot(player.x - 560, player.y - 360) < 70;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('e');
  await page.waitForTimeout(100);
  await page.keyboard.up('e');
  await expect
    .poll(async () => await page.evaluate(() => window.__LIFE_SHIFT__!.quest().state))
    .toBe('find-landmark');

  await page.keyboard.down('d');
  await expect
    .poll(async () => (await playerPos(page)).x, { timeout: 10_000 })
    .toBeGreaterThan(970);
  await page.keyboard.up('d');
  await page.keyboard.down('s');
  await expect
    .poll(async () => (await playerPos(page)).y, { timeout: 10_000 })
    .toBeGreaterThan(490);
  await page.keyboard.up('s');
  await expect
    .poll(async () => await page.evaluate(() => window.__LIFE_SHIFT__!.quest().state))
    .toBe('complete');
});

test('ambient NPC conversations do not skip the quest flow', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard movement for deterministic NPC travel');
  await openGame(page);
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(
      async () => {
        const player = await playerPos(page);
        return player.x > 820;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('e');
  await expect
    .poll(async () => await page.evaluate(() => window.__LIFE_SHIFT__!.quest().state))
    .toBe('explore');
});

test('completing the fountain quest unlocks the lantern park quest', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard movement for deterministic quest travel');
  await openGame(page);

  const moveTo = async (x: number, y: number) => {
    const current = await playerPos(page);
    const horizontal = x > current.x ? 'ArrowRight' : 'ArrowLeft';
    const vertical = y > current.y ? 'ArrowDown' : 'ArrowUp';
    await page.keyboard.down(horizontal);
    await expect
      .poll(async () => Math.abs((await playerPos(page)).x - x), { timeout: 10_000 })
      .toBeLessThan(70);
    await page.keyboard.up(horizontal);
    await page.keyboard.down(vertical);
    await expect
      .poll(async () => Math.abs((await playerPos(page)).y - y), { timeout: 10_000 })
      .toBeLessThan(70);
    await page.keyboard.up(vertical);
  };

  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(
      async () => {
        const player = await playerPos(page);
        return Math.hypot(player.x - 560, player.y - 360) < 70;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('e');
  await page.waitForTimeout(100);
  await page.keyboard.up('e');
  await expect
    .poll(async () => await page.evaluate(() => window.__LIFE_SHIFT__!.quest().state))
    .toBe('find-landmark');
  await moveTo(1040, 560);
  await expect
    .poll(async () => await page.evaluate(() => window.__LIFE_SHIFT__!.quest().state))
    .toBe('complete');
  await moveTo(320, 400);
  await page.keyboard.down('e');
  await page.waitForTimeout(100);
  await page.keyboard.up('e');
  await expect
    .poll(async () => await page.evaluate(() => window.__LIFE_SHIFT__!.quest().state))
    .toBe('find-park');
  await moveTo(320, 560);
  await expect
    .poll(async () => await page.evaluate(() => window.__LIFE_SHIFT__!.quest().state))
    .toBe('complete-lanterns');
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
    await expect
      .poll(
        async () => {
          const body = (await playerPos(page)).body;
          return (
            ((!keys.includes('ArrowLeft') && !keys.includes('a')) || body.left <= 0.5) &&
            ((!keys.includes('ArrowUp') && !keys.includes('w')) || body.top <= 0.5) &&
            ((!keys.includes('d') && !keys.includes('ArrowRight')) ||
              body.right >= world.width - 0.5) &&
            ((!keys.includes('s') && !keys.includes('ArrowDown')) ||
              body.bottom >= world.height - 0.5)
          );
        },
        { intervals: [100], timeout: 15_000 },
      )
      .toBe(true);
    for (const k of keys) await page.keyboard.up(k);
    return (await playerPos(page)).body;
  };

  const topLeft = await holdUntilStopped(['ArrowLeft', 'ArrowUp']);
  expect(topLeft.left).toBeCloseTo(0, 0);
  expect(topLeft.top).toBeCloseTo(0, 0);

  const bottomRight = await holdUntilStopped(['d', 's']);
  expect(bottomRight.right).toBeCloseTo(world.width, 0);
  expect(bottomRight.bottom).toBeCloseTo(world.height, 0);
});

test('city structures block the player while leaving roads open', async ({ page, isMobile }) => {
  test.skip(isMobile, 'uses keyboard to drive the player');
  await openGame(page);

  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await playerPos(page)).x).toBeLessThan(240);
  await page.keyboard.up('ArrowLeft');

  const approach = await playerPos(page);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1_000);
  await page.keyboard.up('ArrowUp');

  const blocked = await playerPos(page);
  expect(blocked.body.top).toBeGreaterThan(250);
  expect(blocked.body.top).toBeLessThan(approach.body.top - 100);
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
