import { expect, test, type Page } from '@playwright/test';
import { openGame, playerPos, teleport, trackErrors, finishConversation } from './helpers';

// Tiles from packages/game-data (maps/town.json, npcs.json, objects.json).
const BELOW_SOMCHAI = { x: 27, y: 24 };
const BELOW_MALI = { x: 24, y: 6 };
const BELOW_KEN = { x: 36, y: 12 };
const BY_SIGN = { x: 23, y: 23 };
const STREET = { x: 10, y: 14 };
const SAVE_KEY = 'life-shift:save:slot1';
// A new game: ฿100 and a bottle of water (packages/game-data/src/economy.json).
const NEW_GAME = {
  flags: {},
  quests: {},
  memories: {},
  money: 100,
  inventory: [{ item: 'water', quantity: 1 }],
};

const dialogue = (page: Page) => page.getByTestId('dialogue');
const toasts = (page: Page) => page.getByTestId('toasts');
const signTexture = (page: Page) =>
  page.evaluate(() => window.__LIFE_SHIFT__!.objectTexture('restaurant_sign'));
const state = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.state());

async function interactWith(page: Page, id: string, tile: { x: number; y: number }) {
  await teleport(page, tile.x, tile.y);
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.target())).toBe(id);
  await page.keyboard.press('e');
  await expect(dialogue(page)).toBeVisible();
}

async function acceptDelivery(page: Page) {
  await interactWith(page, 'somchai', BELOW_SOMCHAI);
  await expect(dialogue(page)).toContainText("Kitchen's closed");
  await page.keyboard.press('1'); // Can I help?
  await page.keyboard.press('1'); // I'll get it.
  await expect(toasts(page)).toContainText('New quest: Fresh Ingredients');
  await finishConversation(page);
}

const openMenu = (page: Page) => page.getByTestId('menu-button').click();

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard controls');

  test('delivering produce opens the restaurant, moves people, and survives a reload', async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await openGame(page);

    await interactWith(page, 'restaurant_sign', BY_SIGN);
    await expect(dialogue(page)).toContainText('CLOSED');
    await finishConversation(page);
    expect(await signTexture(page)).toBe('sign_closed');

    await acceptDelivery(page);
    await interactWith(page, 'mali', BELOW_MALI);
    await expect(dialogue(page)).toContainText('For Somchai');
    await finishConversation(page);
    await interactWith(page, 'somchai', BELOW_SOMCHAI);
    await expect(toasts(page)).toContainText('Quest complete: Fresh Ingredients');
    await finishConversation(page);

    // Consequences: world state, the sign, and where people stand.
    expect((await state(page)).flags).toMatchObject({
      restaurant_open: true,
      market_reputation: 10,
    });
    await expect.poll(() => signTexture(page)).toBe('sign_open');
    await expect
      .poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.npcCurrentTile('somchai')))
      .toEqual({ x: 26, y: 22 });
    await expect
      .poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.npcCurrentTile('bun')))
      .toEqual({ x: 28, y: 23 });

    // Word gets around.
    await interactWith(page, 'mali', BELOW_MALI);
    await expect(dialogue(page)).toContainText('favourite customer');
    await finishConversation(page);

    // Save and reload: everything comes back, including where the player stood.
    await openMenu(page);
    await page.getByTestId('menu-save').click();
    await expect(page.getByTestId('save-status')).toContainText('Saved ✓');
    await page.reload();
    await openGame(page);
    expect((await playerPos(page)).tile).toEqual(BELOW_MALI);
    expect((await state(page)).flags.restaurant_open).toBe(true);
    expect((await state(page)).quests.q_delivery?.status).toBe('completed');
    expect(await signTexture(page)).toBe('sign_open');
    expect(await page.evaluate(() => window.__LIFE_SHIFT__!.npcCurrentTile('somchai'))).toEqual({
      x: 26,
      y: 22,
    });
    expect(errors).toEqual([]);
  });

  test('giving up fails the quest; Somchai remembers and lets you retry', async ({ page }) => {
    await openGame(page);
    await acceptDelivery(page);

    await interactWith(page, 'somchai', BELOW_SOMCHAI);
    await expect(dialogue(page)).toContainText('Any luck');
    await page.keyboard.press('2'); // I can't do this.
    await expect(toasts(page)).toContainText('Quest failed: Fresh Ingredients');
    await finishConversation(page);
    await expect(page.getByTestId('quest-tracker')).toBeHidden();
    expect((await state(page)).memories.somchai).toContainEqual({
      event: 'PLAYER_FAILED_QUEST',
      quest: 'q_delivery',
    });

    await interactWith(page, 'somchai', BELOW_SOMCHAI);
    await expect(dialogue(page)).toContainText('Changed your mind');
    await page.keyboard.press('1');
    await expect(page.getByTestId('quest-tracker')).toContainText('Collect fresh produce');
  });

  test('Load restores the last save, including what NPCs remember', async ({ page }) => {
    await openGame(page);
    await teleport(page, STREET.x, STREET.y);
    await openMenu(page);
    await page.getByTestId('menu-save').click();
    await expect(page.getByTestId('save-status')).toContainText('Saved ✓');
    await page.getByTestId('menu-close').click();

    await interactWith(page, 'ken', BELOW_KEN);
    await expect(dialogue(page)).toContainText('New face');
    await finishConversation(page);
    expect((await state(page)).memories.ken).toEqual([{ event: 'PLAYER_MET_NPC' }]);

    await openMenu(page);
    await page.getByTestId('menu-load').click();
    await expect(toasts(page)).toContainText('Game loaded');
    await expect(page.getByTestId('menu')).toBeHidden();
    expect((await playerPos(page)).tile).toEqual(STREET);
    expect((await state(page)).memories).toEqual({});

    await interactWith(page, 'ken', BELOW_KEN);
    await expect(dialogue(page)).toContainText('New face');
  });

  test('New game needs confirming, then wipes progress and the save', async ({ page }) => {
    await openGame(page);
    await acceptDelivery(page); // autosaves
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), SAVE_KEY)).not.toBeNull();

    await openMenu(page);
    await page.getByTestId('menu-reset').click();
    await expect(page.getByTestId('menu-reset')).toContainText('Tap again');
    expect((await state(page)).quests.q_delivery).toBeDefined();

    await page.getByTestId('menu-reset').click();
    await expect(toasts(page)).toContainText('New game started');
    expect(await state(page)).toEqual(NEW_GAME);
    expect((await playerPos(page)).tile).toEqual({ x: 4, y: 7 });

    await page.reload();
    await openGame(page);
    expect(await state(page)).toEqual(NEW_GAME);
    await expect(page.getByTestId('quest-tracker')).toBeHidden();
  });

  test('the menu pauses the game', async ({ page }) => {
    await openGame(page);
    await teleport(page, STREET.x, STREET.y);
    await openMenu(page);
    const before = await playerPos(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
    expect((await playerPos(page)).x).toBeCloseTo(before.x, 0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('menu')).toBeHidden();
  });

  test('a corrupted save starts a new game instead of breaking', async ({ page }) => {
    const errors = trackErrors(page);
    await page.addInitScript(
      (key) => localStorage.setItem(key, '{"saveVersion": 1, "sta'),
      SAVE_KEY,
    );
    await openGame(page);
    expect(await state(page)).toEqual(NEW_GAME);
    await openMenu(page);
    await expect(page.getByTestId('save-status')).toHaveText('Not saved yet');
    expect(errors).toEqual([]);
  });
});

test.describe('touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch controls');

  test('menu works by tapping and hides world controls while open', async ({ page }) => {
    await openGame(page);
    await teleport(page, BY_SIGN.x, BY_SIGN.y);
    await expect(page.getByTestId('action')).toHaveText(/Look at Restaurant sign/);

    await page.getByTestId('menu-button').tap();
    await expect(page.getByTestId('menu')).toBeVisible();
    await expect(page.getByTestId('action')).toBeHidden();
    for (const item of await page.getByTestId('menu').getByRole('button').all()) {
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }

    await page.getByTestId('menu-save').tap();
    await expect(page.getByTestId('save-status')).toContainText('Saved ✓');
    await page.getByTestId('menu-close').tap();
    await expect(page.getByTestId('menu')).toBeHidden();
    await expect(page.getByTestId('action')).toBeVisible();
  });
});
