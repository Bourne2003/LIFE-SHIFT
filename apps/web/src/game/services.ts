import type Phaser from 'phaser';
import type { GameContent, LocationDef } from '@life-shift/shared';
import { InputManager } from '../input/InputManager';
import { DialogueController } from './DialogueController';
import { Emitter } from './events';
import { GameSession } from './GameSession';

/** World happenings the UI reacts to (not game state — that lives in GameSession). */
export interface WorldEvents {
  /** What the player would interact with right now, or null. */
  interactTarget: { readonly id: string; readonly name: string } | null;
  /** The most specific named location the player just walked into. */
  areaEntered: LocationDef;
}

/**
 * Game-wide services shared between scenes and the DOM UI. Created once per game and reached
 * through getServices() instead of module-level globals, so a second game instance (tests,
 * split-screen) never shares state.
 */
export interface GameServices {
  readonly content: GameContent;
  readonly input: InputManager;
  readonly session: GameSession;
  readonly dialogue: DialogueController;
  readonly world: Emitter<WorldEvents>;
}

const REGISTRY_KEY = 'services';

export function createServices(content: GameContent): GameServices {
  const session = new GameSession(content);
  return {
    content,
    input: new InputManager(),
    session,
    dialogue: new DialogueController(session),
    world: new Emitter<WorldEvents>(),
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
