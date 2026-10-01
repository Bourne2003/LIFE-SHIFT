import type Phaser from 'phaser';
import type { GameContent, LocationDef, SaveData } from '@life-shift/shared';
import { InputManager } from '../input/InputManager';
import { DialogueController } from './DialogueController';
import { Emitter } from './events';
import { GameSession } from './GameSession';
import { MemorySaveStorage, SaveService, type SaveStorage } from './SaveService';

/** World happenings the UI reacts to (not game state — that lives in GameSession). */
export interface WorldEvents {
  /** What the player would interact with right now, or null. */
  interactTarget: {
    readonly id: string;
    readonly name: string;
    readonly kind: 'npc' | 'object';
  } | null;
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
  readonly save: SaveService;
  readonly world: Emitter<WorldEvents>;
  /** UI state gameplay needs to respect (e.g. no walking while the menu is open). */
  readonly ui: { menuOpen: boolean };
}

export interface ServiceOptions {
  readonly storage?: SaveStorage;
  /** A previously saved game to continue. */
  readonly save?: SaveData;
}

const REGISTRY_KEY = 'services';

export function createServices(content: GameContent, options: ServiceOptions = {}): GameServices {
  const session = new GameSession(content, options.save?.state);
  const dialogue = new DialogueController(session);
  const save = new SaveService(options.storage ?? new MemorySaveStorage(), session, options.save);
  // A load or new game replaces the whole world; an open conversation no longer makes sense.
  save.on('status', (s) => {
    if (s.kind === 'loaded' || s.kind === 'reset') dialogue.close();
  });
  return {
    content,
    input: new InputManager(),
    session,
    dialogue,
    save,
    world: new Emitter<WorldEvents>(),
    ui: { menuOpen: false },
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
