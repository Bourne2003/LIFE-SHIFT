import { expect, test, type Page } from '@playwright/test';
import { dialogueState, nearbyNpc, openGame, playerPos, questLog, teleport } from './helpers';

// Standing spots (player feet, world units) within talking range of each NPC.
const NEAR_MINA = { x: 592, y: 320 }; // just south of Mina (feet at 592, 288)
const NEAR_SOMCHAI = { x: 712, y: 608 }; // just west of Somchai (feet at 752, 608)

/** Presses a key and waits until the open conversation shows matching Thai text (or closes). */
async function press(page: Page, key: string, expectText: RegExp | null) {
  await page.keyboard.press(key);
  if (expectText === null) await expect.poll(() => dialogueState(page)).toBeNull();
  else
    await expect.poll(async () => (await dialogueState(page))?.text.th ?? '').toMatch(expectText);
}

test("desktop: complete Mina's recipe quest (in Thai) by talking to Mina, Somchai, then Mina", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'keyboard is a desktop input');
  await openGame(page);
  expect(await nearbyNpc(page)).toBeNull();
  await page.keyboard.press('e'); // nobody around: nothing happens
  expect(await dialogueState(page)).toBeNull();

  await teleport(page, NEAR_MINA);
  await expect.poll(() => nearbyNpc(page)).toBe('mina');

  // The game runs in Thai by default.
  await press(page, 'e', /ฉันชื่อมีนา/);
  expect((await dialogueState(page))!.speaker).toEqual({ th: 'มีนา', en: 'Mina' });
  await press(page, 'e', /สูตรใหม่/);
  expect((await dialogueState(page))!.choices.map((c) => c.th)).toEqual([
    'ได้เลย เดี๋ยวเอาไปให้',
    'ตอนนี้ยังไม่ว่าง',
  ]);

  // Movement keys navigate choices and do not move the player while talking.
  const before = await playerPos(page);
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await dialogueState(page))!.selected).toBe(1);
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await dialogueState(page))!.selected).toBe(0);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowLeft');
  expect((await playerPos(page)).x).toBeCloseTo(before.x, 0);

  await press(page, 'Enter', /ขอบใจมาก/);
  expect(await questLog(page)).toEqual({ 'minas-recipe': { status: 'active', step: 'deliver' } });
  await press(page, 'Space', null);

  await teleport(page, NEAR_SOMCHAI);
  await expect.poll(() => nearbyNpc(page)).toBe('somchai');
  await press(page, 'e', /สูตรจากมีนา/);
  expect(await questLog(page)).toEqual({ 'minas-recipe': { status: 'active', step: 'return' } });
  await press(page, 'e', null);

  await teleport(page, NEAR_MINA);
  await expect.poll(() => nearbyNpc(page)).toBe('mina');
  await press(page, 'e', /ได้รับแล้ว/);
  await press(page, 'e', null);
  expect(await questLog(page)).toEqual({ 'minas-recipe': { status: 'completed' } });

  // Mina remembers: a new line once the quest is done.
  await press(page, 'e', /ทำได้อร่อยแล้ว/);
});

test('touch: the Talk button appears near an NPC and opens the dialogue', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'touch input');
  await openGame(page);
  expect(await page.evaluate(() => window.__LIFE_SHIFT__!.interactButton()!.visible)).toBe(false);

  const { width, height } = page.viewportSize()!;
  const cdp = await page.context().newCDPSession(page);
  const tap = async (x: number, y: number) => {
    for (const type of ['touchStart', 'touchEnd'] as const)
      await cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
  };

  await teleport(page, NEAR_MINA);
  await expect.poll(() => nearbyNpc(page)).toBe('mina');
  const button = await page.evaluate(() => window.__LIFE_SHIFT__!.interactButton()!);
  expect(button.visible).toBe(true);
  expect(button.x).toBeGreaterThan(width * 0.6); // clear of the joystick area
  await tap(button.x, button.y);
  await expect.poll(async () => (await dialogueState(page))?.speaker.th).toBe('มีนา');

  // Tapping the dialogue box continues the conversation.
  await tap(width / 2, height - 40);
  await expect.poll(async () => (await dialogueState(page))?.choices.length).toBe(2);
});
