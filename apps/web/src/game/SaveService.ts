import {
  parseSave,
  serializeSave,
  type GameState,
  type SaveData,
  type Vec2,
} from '@life-shift/shared';

/** The part of Web Storage the save system needs; injectable for tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'life-shift.save';
/** Where an unreadable save is moved, so a bug never silently destroys a player's progress. */
export const BROKEN_SAVE_KEY = 'life-shift.save.unreadable';

/**
 * Reads and writes the single save slot. Every storage call is guarded: private browsing,
 * full quota or blocked storage must never crash the game, only disable saving.
 */
export class SaveService {
  /** The save found at startup, if any. */
  readonly loaded: SaveData | null;

  constructor(private readonly store: KeyValueStore | null) {
    this.loaded = this.read();
  }

  get available(): boolean {
    return this.store !== null;
  }

  /** Writes the state; returns false if it could not be stored. */
  write(state: GameState, player: Vec2 | null): boolean {
    if (!this.store) return false;
    try {
      this.store.setItem(SAVE_KEY, serializeSave(state, player));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.store?.removeItem(SAVE_KEY);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
  }

  private read(): SaveData | null {
    let json: string | null;
    try {
      json = this.store?.getItem(SAVE_KEY) ?? null;
    } catch {
      return null;
    }
    if (json === null) return null;
    const result = parseSave(json);
    if (result.ok) return result.save;
    console.warn(`Save could not be read (${result.error}); starting a new game.`);
    try {
      this.store?.setItem(BROKEN_SAVE_KEY, json);
      this.store?.removeItem(SAVE_KEY);
    } catch {
      // Keep going with a new game even if the backup fails.
    }
    return null;
  }
}

/** The browser's localStorage, or null where it is blocked. */
export function browserStore(): KeyValueStore | null {
  try {
    const store = window.localStorage;
    return store ?? null;
  } catch {
    return null;
  }
}
