import { expect, test, type Page } from '@playwright/test';
import { openGame, playerPos, teleport, trackErrors, finishConversation } from './helpers';

// Tiles from packages/game-data.
const BELOW_MALI = { x: 24, y: 6 };
const BELOW_KEN = { x: 36, y: 12 };
const BELOW_SOMCHAI = { x: 27, y: 24 };
const SOMCHAI_AT_RESTAURANT = { x: 26, y: 23 };
const STREET = { x: 10, y: 14 };
const SAVE_KEY = 'life-shift:save:slot1';

const dialogue = (page: Page) => page.getByTestId('dialogue');
const shop = (page: Page) => page.getByTestId('shop');
const toasts = (page: Page) => page.getByTestId('toasts');
const money = (page: Page) => page.getByTestId('money');
const state = (page: Page) => page.evaluate(() => window.__LIFE_SHIFT__!.state());

async function talkTo(page: Page, id: string, tile: { x: number; y: number }) {
  await teleport(page, tile.x, tile.y);
  await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.target())).toBe(id);
  await page.keyboard.press('e');
  await expect(dialogue(page)).toBeVisible();
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard controls');

  test('buy and sell at Mali’s stall; money and bag survive a reload', async ({ page }) => {
    const errors = trackErrors(page);
    await openGame(page);
    await expect(money(page)).toHaveText('฿100');

    await talkTo(page, 'mali', BELOW_MALI);
    await page.keyboard.press('2'); // Show me your fruit.
    await expect(shop(page)).toBeVisible();
    await expect(page.getByTestId('shop-title')).toHaveText("Mali's Fruit Stall");

    await page.getByTestId('buy-mango').click();
    await expect(page.getByTestId('shop-message')).toHaveText('Bought Mango for ฿12');
    await page.getByTestId('buy-mango').click();
    await expect(money(page)).toHaveText('฿76');

    await page.getByTestId('shop-tab-sell').click();
    await page.getByTestId('sell-mango').click();
    await expect(page.getByTestId('shop-message')).toHaveText('Sold Mango for ฿6');
    await page.getByTestId('sell-water').click(); // Mali buys any food
    await expect(money(page)).toHaveText('฿84');
    await expect(page.getByTestId('sell-water')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(shop(page)).toBeHidden();
    expect((await state(page)).inventory).toEqual([{ item: 'mango', quantity: 1 }]);

    await page.getByTestId('menu-button').click();
    await page.getByTestId('menu-save').click();
    await expect(page.getByTestId('save-status')).toContainText('Saved ✓');
    await page.reload();
    await openGame(page);
    await expect(money(page)).toHaveText('฿84');
    expect((await state(page)).inventory).toEqual([{ item: 'mango', quantity: 1 }]);
    expect(errors).toEqual([]);
  });

  test('cannot spend money you do not have', async ({ page }) => {
    await openGame(page);
    await talkTo(page, 'mali', BELOW_MALI);
    await page.keyboard.press('2');
    for (let i = 0; i < 5; i++) await page.getByTestId('buy-mangosteen').click(); // 5 × ฿20
    await expect(money(page)).toHaveText('฿0');
    await page.getByTestId('buy-mangosteen').click();
    await expect(page.getByTestId('shop-message')).toHaveText("You can't afford that.");
    await expect(money(page)).toHaveText('฿0');
    expect((await state(page)).inventory).toContainEqual({ item: 'mangosteen', quantity: 5 });
  });

  test('the delivery uses a real crate, pays out, and opens Somchai’s kitchen for orders', async ({
    page,
  }) => {
    await openGame(page);
    await talkTo(page, 'somchai', BELOW_SOMCHAI);
    await expect(dialogue(page).getByRole('button', { name: /order/ })).toHaveCount(0);
    await page.keyboard.press('1');
    await page.keyboard.press('1');
    await finishConversation(page);

    await talkTo(page, 'mali', BELOW_MALI);
    await finishConversation(page);
    await expect(toasts(page)).toContainText('+1 Crate of produce');

    // It's in the bag, and quest items can't be sold.
    await page.keyboard.press('i');
    await expect(page.getByTestId('bag')).toBeVisible();
    await expect(page.getByTestId('bag-slot').filter({ hasText: 'Crate of produce' })).toHaveCount(
      1,
    );
    await page.keyboard.press('Escape');

    await talkTo(page, 'somchai', BELOW_SOMCHAI);
    await expect(toasts(page)).toContainText('−1 Crate of produce');
    await expect(toasts(page)).toContainText('+฿50');
    await finishConversation(page);
    await expect(money(page)).toHaveText('฿150');

    await talkTo(page, 'somchai', SOMCHAI_AT_RESTAURANT);
    await page.keyboard.press('e');
    await page.keyboard.press('1'); // I'd like to order.
    await expect(page.getByTestId('shop-title')).toHaveText("Somchai's Kitchen");
    await page.getByTestId('buy-green_curry').click();
    await expect(money(page)).toHaveText('฿115');
  });

  test('the bag opens with I, pauses the game, and closes with Esc', async ({ page }) => {
    await openGame(page);
    await teleport(page, STREET.x, STREET.y);
    await page.keyboard.press('i');
    await expect(page.getByTestId('bag')).toContainText('Bag 1/20');
    await page.getByTestId('bag-slot').first().click();
    await expect(page.getByTestId('bag')).toContainText('Cold, if you are lucky.');

    const before = await playerPos(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
    expect((await playerPos(page)).x).toBeCloseTo(before.x, 0);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('bag')).toBeHidden();
  });

  test('an old version-1 save is migrated: progress kept, starting money added', async ({
    page,
  }) => {
    const errors = trackErrors(page);
    const v1 = {
      saveVersion: 1,
      savedAt: '2026-10-01T00:00:00.000Z',
      state: { flags: { restaurant_open: true }, quests: {}, memories: {} },
      player: { tile: STREET },
    };
    await page.addInitScript(
      ([key, data]) => localStorage.setItem(key!, data!),
      [SAVE_KEY, JSON.stringify(v1)],
    );
    await openGame(page);
    const s = await state(page);
    expect(s.flags.restaurant_open).toBe(true);
    expect(s.money).toBe(100);
    expect(s.inventory).toEqual([{ item: 'water', quantity: 1 }]);
    expect((await playerPos(page)).tile).toEqual(STREET);
    expect(errors).toEqual([]);
  });
});

test.describe('touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch controls');

  test('shop and bag are usable by tapping with large targets', async ({ page }) => {
    await openGame(page);
    await teleport(page, BELOW_KEN.x, BELOW_KEN.y);
    await expect.poll(() => page.evaluate(() => window.__LIFE_SHIFT__!.target())).toBe('ken');
    await page.getByTestId('action').tap();
    await dialogue(page).tap();
    await dialogue(page)
      .getByRole('button', { name: /browse/ })
      .tap();
    await expect(shop(page)).toBeVisible();

    for (const button of await shop(page).getByRole('button').all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByTestId('buy-bread').tap();
    await expect(money(page)).toHaveText('฿85');
    await page.getByTestId('shop-close').tap();

    await page.getByTestId('bag-button').tap();
    await expect(page.getByTestId('bag-slot')).toHaveCount(2);
    for (const slot of await page.getByTestId('bag-slot').all()) {
      expect((await slot.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByTestId('bag-close').tap();
    await expect(page.getByTestId('bag')).toBeHidden();
  });
});
