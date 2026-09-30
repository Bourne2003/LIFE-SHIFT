import type Phaser from 'phaser';
import { InputManager } from '../input/InputManager';

/**
 * Game-wide services shared between scenes. Created once per Phaser.Game and reached through
 * getServices() instead of module-level globals, so a second game instance (tests, split-screen)
 * never shares state. Future systems (world state, save, network) register here.
 */
export interface GameServices {
  readonly input: InputManager;
}

const REGISTRY_KEY = 'services';

export function createServices(): GameServices {
  return { input: new InputManager() };
}

export function installServices(game: Phaser.Game, services: GameServices): void {
  game.registry.set(REGISTRY_KEY, services);
}

export function getServices(scene: Phaser.Scene): GameServices {
  const services = scene.registry.get(REGISTRY_KEY) as GameServices | undefined;
  if (!services) throw new Error('GameServices not installed — create the game via createGame()');
  return services;
}
