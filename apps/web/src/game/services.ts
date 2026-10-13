import type Phaser from 'phaser';
import { CONTENT } from '@life-shift/game-data';
import { createBrowserLocale } from '../i18n/browser';
import type { LocaleService } from '../i18n/LocaleService';
import { InputManager } from '../input/InputManager';
import { GameSession } from './session';

/**
 * Game-wide services shared between scenes. Created once per Phaser.Game and reached through
 * getServices() instead of module-level globals, so a second game instance (tests, split-screen)
 * never shares state. Future systems (save, network) register here.
 */
export interface GameServices {
  readonly input: InputManager;
  readonly session: GameSession;
  readonly i18n: LocaleService;
}

const REGISTRY_KEY = 'services';

export function createServices(): GameServices {
  return {
    input: new InputManager(),
    session: new GameSession(CONTENT),
    i18n: createBrowserLocale(),
  };
}

export function installServices(game: Phaser.Game, services: GameServices): void {
  game.registry.set(REGISTRY_KEY, services);
}

export function getServices(scene: Phaser.Scene): GameServices {
  const services = scene.registry.get(REGISTRY_KEY) as GameServices | undefined;
  if (!services) throw new Error('GameServices not installed — create the game via createGame()');
  return services;
}
