import { expect, test, type Page } from '@playwright/test';
import { openGame, playerPos, teleport, trackErrors, walkUntilBlocked } from './helpers';

// Tiles from packages/game-data (see maps/town.json and npcs.json).
const BELOW_NOI = { x: 12, y: 12 };
const BELOW_KEN = { x: 36, y: 12 };
const CLOCK_TOWER_PLAZA = { x: 35, y: 25 };

const dialogue = (page: Page) => page.getByTestId('dialogue');
const tracker = (page: Page) => page.getByTestId('quest-tracker');
const toasts = (page: Page) => page.getByTestId('toasts');
const quest = (page: Page) =>
  page.evaluate(() => window.__LIFE_SHIFT__!.state().quests.q_know_town);

async function talkTo(page: Page, npc: string, tile: { x: number; y: number }) {
  await teleport(page, tile.x, tile.y);
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.target())).toBe(npc);
}

/** Presses E until the conversation closes (fails if it is stuck on a choice). */
async function finishConversation(page: Page) {
  for (let i = 0; i < 10 && (await dialogue(page).isVisible()); i++) {
    await page.keyboard.press('e');
    await page.waitForTimeout(50);
  }
  await expect(dialogue(page)).toBeHidden();
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard controls');

  test('buildings block movement', async ({ page }) => {
    await openGame(page);
    await teleport(page, 8, 4); // grass between two houses; the left house spans x 3-6
    const stopped = await walkUntilBlocked(page, ['ArrowLeft']);
    expect(stopped.body.left).toBeCloseTo(7 * 32, 0);
  });

  test('NPCs block movement', async ({ page }) => {
    await openGame(page);
    await teleport(page, 14, 11); // two tiles right of Grandma Noi (12, 11)
    const stopped = await walkUntilBlocked(page, ['ArrowLeft']);
    // Noi's feet body: centred on her tile (x = 12.5 tiles = 400px), 60% of 24px wide.
    expect(stopped.body.left).toBeCloseTo(400 + 7.2, 0);
  });

  test('walking up to an NPC shows a prompt; E starts and Esc ends the conversation', async ({
    page,
  }) => {
    await openGame(page);
    await expect(page.getByTestId('action')).toBeHidden();
    await talkTo(page, 'ken', BELOW_KEN);
    await expect(page.getByTestId('action')).toHaveText(/Talk to Ken/);

    await page.keyboard.press('e');
    await expect(dialogue(page)).toContainText('Ken');
    await expect(page.getByTestId('action')).toBeHidden();

    // The player cannot walk away mid-conversation.
    const before = await playerPos(page);
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowDown');
    expect((await playerPos(page)).y).toBeCloseTo(before.y, 0);

    await page.keyboard.press('Escape');
    await expect(dialogue(page)).toBeHidden();
  });

  test('complete "Getting to Know Ban Suan" with the keyboard', async ({ page }) => {
    const errors = trackErrors(page);
    await openGame(page);

    // Accept the quest from Grandma Noi (choice 1).
    await talkTo(page, 'noi', BELOW_NOI);
    await page.keyboard.press('e');
    await expect(dialogue(page)).toContainText('Grandma Noi');
    await page.keyboard.press('e');
    await expect(dialogue(page).getByRole('button')).toHaveCount(2);
    await page.keyboard.press('1');
    await expect(toasts(page)).toContainText('New quest: Getting to Know Ban Suan');
    await expect(tracker(page)).toContainText('Say hello to Ken');
    await finishConversation(page);

    // Ken: talking completes the first objective.
    await talkTo(page, 'ken', BELOW_KEN);
    await page.keyboard.press('e');
    await expect(dialogue(page)).toContainText('Noi sent you');
    await expect(tracker(page)).toContainText('Visit the Clock Tower Plaza');
    await finishConversation(page);

    // Reaching the plaza completes the second.
    await teleport(page, CLOCK_TOWER_PLAZA.x, CLOCK_TOWER_PLAZA.y);
    await expect(tracker(page)).toContainText('Return to Grandma Noi');

    // Back to Noi to finish.
    await talkTo(page, 'noi', BELOW_NOI);
    await page.keyboard.press('e');
    await expect(dialogue(page)).toContainText('Back already');
    await page.keyboard.press('2');
    await expect(toasts(page)).toContainText('Quest complete');
    await finishConversation(page);

    expect(await quest(page)).toEqual({ status: 'completed', objectiveIndex: 3 });
    expect(await page.evaluate(() => window.__LIFE_SHIFT__!.state().flags.knows_town)).toBe(true);
    await expect(tracker(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('finding the hidden garden announces a discovery', async ({ page }) => {
    await openGame(page);
    await teleport(page, 3, 27);
    await expect(toasts(page)).toContainText('Discovered: Forgotten Garden');
  });
});

test.describe('touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch controls');

  test('tap Talk, tap through dialogue and tap a choice', async ({ page }) => {
    await openGame(page);
    await talkTo(page, 'noi', BELOW_NOI);

    await page.getByTestId('action').tap();
    await expect(dialogue(page)).toContainText('Welcome to Ban Suan');
    await dialogue(page).tap();
    await dialogue(page).getByRole('button', { name: /Sure/ }).tap();

    await expect(tracker(page)).toContainText('Say hello to Ken');
    expect(await quest(page)).toEqual({ status: 'active', objectiveIndex: 0 });
  });

  test('controls are large enough to tap', async ({ page }) => {
    await openGame(page);
    await talkTo(page, 'noi', BELOW_NOI);
    const action = await page.getByTestId('action').boundingBox();
    expect(action!.height).toBeGreaterThanOrEqual(44);

    await page.getByTestId('action').tap();
    await dialogue(page).tap();
    for (const button of await dialogue(page).getByRole('button').all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
