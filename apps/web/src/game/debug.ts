import type Phaser from 'phaser';
import type { GameState, Locale, LocalizedText, QuestLog } from '@life-shift/shared';
import { SAVE_KEY } from './SaveService';
import { SceneKeys } from './sceneKeys';
import { getServices } from './services';
import type { ConversationView, EnvironmentView, ShopView } from './session';
import type { UIScene } from '../scenes/UIScene';
import type { WorldScene } from '../scenes/WorldScene';

/**
 * State snapshots (plus test hooks: teleport, setClock) for automated browser tests and console
 * debugging. Installed in dev builds only; never part of the production bundle.
 */
export interface DebugApi {
  isReady(): boolean;
  player(): {
    x: number;
    y: number;
    facing: string;
    state: string;
    /** Physics body (feet) bounds — what actually collides with the world. */
    body: { left: number; top: number; right: number; bottom: number };
  };
  world(): { width: number; height: number };
  camera(): { scrollX: number; scrollY: number; zoom: number; width: number; height: number };
  npcs(): { id: string; name: LocalizedText; x: number; y: number }[];
  /** Id of the NPC the player can talk to right now. */
  nearbyNpc(): string | null;
  dialogue(): ConversationView | null;
  quests(): QuestLog;
  /** The full persistent state (what a save contains). */
  state(): GameState;
  /** Ids of world props currently shown. */
  props(): string[];
  /** The open shop, if any. */
  shop(): ShopView | null;
  inventoryOpen(): boolean;
  /** Screen positions of the bag button and of open panels' rows and buttons. */
  controls(): UIScene['controls'];
  /** Clock, weather and lighting as currently shown. */
  environment(): EnvironmentView & { nightOpacity: number; raining: boolean };
  /** Jumps the world clock (dev-only test hook). */
  setClock(day: number, minute: number): void;
  /** Whether a save exists in storage right now. */
  hasSave(): boolean;
  /** Screen position of the touch interact button, if this device has one. */
  interactButton(): { x: number; y: number; visible: boolean } | null;
  locale(): Locale;
  /** Screen position (centre) of the language switch button. */
  languageButton(): { x: number; y: number };
  /** Moves the player so its feet stand at (x, y) in world units. */
  teleport(x: number, y: number): void;
}

declare global {
  interface Window {
    __LIFE_SHIFT__?: DebugApi;
  }
}

export function installDebugApi(game: Phaser.Game): void {
  const world = () => game.scene.getScene(SceneKeys.World) as WorldScene;
  const ui = () => game.scene.getScene(SceneKeys.UI) as UIScene;
  const session = () => getServices(world()).session;
  window.__LIFE_SHIFT__ = {
    isReady: () =>
      game.isBooted &&
      game.scene.isActive(SceneKeys.World) &&
      game.scene.isActive(SceneKeys.UI) &&
      !!world().player,
    player: () => {
      const p = world().player;
      const b = p.sprite.body;
      return {
        x: p.sprite.x,
        y: p.sprite.y,
        facing: p.facing,
        state: p.state,
        body: { left: b.left, top: b.top, right: b.right, bottom: b.bottom },
      };
    },
    world: () => {
      const { width, height } = world().physics.world.bounds;
      return { width, height };
    },
    camera: () => {
      const c = world().cameras.main;
      return {
        scrollX: c.scrollX,
        scrollY: c.scrollY,
        zoom: c.zoom,
        width: c.width,
        height: c.height,
      };
    },
    npcs: () => world().npcs.slice(),
    nearbyNpc: () => session().nearbyNpc?.id ?? null,
    dialogue: () => session().conversation,
    quests: () => session().quests,
    state: () => session().state,
    props: () => world().visibleProps,
    shop: () => session().shopView,
    inventoryOpen: () => session().inventoryOpen,
    controls: () => ui().controls,
    environment: () => ({
      ...session().environment,
      nightOpacity: world().nightOpacity,
      raining: ui().raining,
    }),
    setClock: (day, minute) => session().setClock({ day, minute }),
    hasSave: () => window.localStorage.getItem(SAVE_KEY) !== null,
    interactButton: () => {
      const button = ui().interactButton;
      return button ? { ...button.position, visible: button.visible } : null;
    },
    locale: () => getServices(world()).i18n.locale,
    languageButton: () => ui().languageButtonCenter,
    teleport: (x, y) => world().player.placeFeetAt(x, y),
  };
}
