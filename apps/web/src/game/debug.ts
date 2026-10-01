import type Phaser from 'phaser';
import type { GameState, TilePos } from '@life-shift/shared';
import { worldToTile } from '@life-shift/shared';
import type { DialogueView } from './DialogueController';
import { SceneKeys } from './sceneKeys';
import type { GameServices } from './services';
import type { WorldScene } from '../scenes/WorldScene';

/** Snapshot + test controls for automated browser tests and console debugging. Dev builds only. */
export interface DebugApi {
  isReady(): boolean;
  player(): {
    x: number;
    y: number;
    tile: TilePos;
    facing: string;
    state: string;
    /** Physics body (feet) bounds — what actually collides with the world. */
    body: { left: number; top: number; right: number; bottom: number };
  };
  world(): { width: number; height: number };
  camera(): { scrollX: number; scrollY: number; zoom: number; width: number; height: number };
  state(): GameState;
  dialogue(): DialogueView | null;
  /** Id of the NPC the player would talk to right now. */
  target(): string | null;
  /** Default tile of an NPC in the content. */
  npcTile(id: string): TilePos;
  /** Tile an NPC is standing on right now (after schedule changes). */
  npcCurrentTile(id: string): TilePos;
  /** Texture an object currently shows. */
  objectTexture(id: string): string;
  teleport(tile: TilePos): void;
}

declare global {
  interface Window {
    __LIFE_SHIFT__?: DebugApi;
  }
}

export function installDebugApi(game: Phaser.Game, services: GameServices): void {
  const world = () => game.scene.getScene(SceneKeys.World) as WorldScene;
  window.__LIFE_SHIFT__ = {
    isReady: () => game.isBooted && game.scene.isActive(SceneKeys.World) && !!world().player,
    player: () => {
      const p = world().player;
      const b = p.sprite.body;
      return {
        x: p.sprite.x,
        y: p.sprite.y,
        tile: worldToTile(p.position),
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
    state: () => services.session.state,
    dialogue: () => services.dialogue.view(),
    target: () => world().interactTarget ?? null,
    npcTile: (id) => {
      const npc = services.content.npcs.find((n) => n.id === id);
      if (!npc) throw new Error(`Unknown npc ${id}`);
      return npc.position;
    },
    npcCurrentTile: (id) => {
      const npc = world().npcs.find((n) => n.id === id);
      if (!npc) throw new Error(`Unknown npc ${id}`);
      return npc.tile;
    },
    objectTexture: (id) => {
      const object = world().objects.find((o) => o.id === id);
      if (!object) throw new Error(`Unknown object ${id}`);
      return object.sprite.texture.key;
    },
    teleport: (tile) => world().teleport(tile),
  };
}
