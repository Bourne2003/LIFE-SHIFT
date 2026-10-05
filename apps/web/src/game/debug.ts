import type Phaser from 'phaser';
import { SceneKeys } from './sceneKeys';
import type { WorldScene } from '../scenes/WorldScene';

/** Read-only snapshot for automated browser tests and console debugging. Dev builds only. */
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
  quest(): { state: string };
  camera(): { scrollX: number; scrollY: number; zoom: number; width: number; height: number };
}

declare global {
  interface Window {
    __LIFE_SHIFT__?: DebugApi;
  }
}

export function installDebugApi(game: Phaser.Game): void {
  const world = () => game.scene.getScene(SceneKeys.World) as WorldScene;
  window.__LIFE_SHIFT__ = {
    isReady: () => game.isBooted && game.scene.isActive(SceneKeys.World) && !!world().player,
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
    quest: () => ({ state: world().questState }),
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
  };
}
