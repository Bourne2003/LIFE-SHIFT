import { expect, test, type Page } from '@playwright/test';
import { dialogueState, openGame, playerPos, questLog, teleport, trackErrors } from './helpers';

const NEAR_MINA = { x: 592, y: 320 };
const NEAR_SOMCHAI = { x: 712, y: 608 };

const props = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.props());

/** Talks to whoever is in reach, confirming the first choice, until the conversation ends. */
async function talkThrough(page: Page) {
  await page.keyboard.press('e');
  await expect.poll(() => dialogueState(page)).not.toBeNull();
  while (await dialogueState(page)) {
    await page.keyboard.press('e');
    await page.waitForTimeout(50);
  }
}

async function talkTo(page: Page, spot: { x: number; y: number }, npc: string) {
  await teleport(page, spot);
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.nearbyNpc())).toBe(npc);
  await talkThrough(page);
}

test('finishing a quest changes the world, and the world is remembered after reload', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'drives dialogue with the keyboard');
  await openGame(page);
  expect(await props(page)).toEqual([]); // fresh game: no stall yet

  await talkTo(page, NEAR_MINA, 'mina');
  await talkTo(page, NEAR_SOMCHAI, 'somchai');
  await talkTo(page, NEAR_MINA, 'mina');
  expect(await questLog(page)).toEqual({ 'minas-recipe': { status: 'completed' } });
  await expect.poll(() => props(page)).toEqual(['somchai-noodle-stall']);

  // Walk somewhere else, then leave the page (autosave on pagehide) and come back.
  await teleport(page, { x: 400, y: 600 });
  await page.waitForTimeout(100);
  const before = await playerPos(page);
  await page.reload();
  await openGame(page);

  expect(await questLog(page)).toEqual({ 'minas-recipe': { status: 'completed' } });
  expect(await props(page)).toEqual(['somchai-noodle-stall']);
  const after = await playerPos(page);
  expect(after.body.bottom).toBeCloseTo(before.body.bottom, -1);
  expect((after.body.left + after.body.right) / 2).toBeCloseTo(400, -1);
  const state = await page.evaluate(() => window.__LIFE_SHIFT__!.state());
  expect(state.npcs).toEqual({ mina: { talks: 2 }, somchai: { talks: 1 } });

  // Somchai now talks about his new stall.
  await teleport(page, NEAR_SOMCHAI);
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.nearbyNpc())).toBe('somchai');
  await page.keyboard.press('e');
  await expect.poll(async () => (await dialogueState(page))?.text.th ?? '').toMatch(/ร้านเปิดแล้ว/);
});

test('an unreadable save starts a new game without errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('life-shift.save', '{not a save');
      sessionStorage.setItem('seeded', '1');
    }
  });
  await openGame(page);
  expect(await questLog(page)).toEqual({});
  expect(await page.evaluate(() => localStorage.getItem('life-shift.save.unreadable'))).toBe(
    '{not a save',
  );
  expect(errors).toEqual([]);
});
