import {
  createSave,
  loadSave,
  newGameState,
  type GameContent,
  type SaveData,
  type TilePos,
} from '@life-shift/shared';
import { Emitter } from './events';
import type { GameSession } from './GameSession';

/** Where save data lives. Async so IndexedDB or a server can replace localStorage later. */
export interface SaveStorage {
  read(): Promise<string | null>;
  write(data: string): Promise<void>;
  clear(): Promise<void>;
}

/** Browser storage. Fails gracefully (private mode, quota, disabled storage). */
export class LocalSaveStorage implements SaveStorage {
  constructor(private readonly key = 'life-shift:save:slot1') {}

  async read(): Promise<string | null> {
    return this.guard(() => window.localStorage.getItem(this.key));
  }

  async write(data: string): Promise<void> {
    this.guard(() => window.localStorage.setItem(this.key, data));
  }

  async clear(): Promise<void> {
    this.guard(() => window.localStorage.removeItem(this.key));
  }

  private guard<T>(fn: () => T): T {
    try {
      return fn();
    } catch (e) {
      throw new Error(`Browser storage unavailable (${(e as Error).name})`, { cause: e });
    }
  }
}

/** In-memory storage for tests. */
export class MemorySaveStorage implements SaveStorage {
  constructor(public data: string | null = null) {}
  async read() {
    return this.data;
  }
  async write(data: string) {
    this.data = data;
  }
  async clear() {
    this.data = null;
  }
}

export type SaveStatus =
  | { readonly kind: 'saved' | 'loaded'; readonly at: string }
  | { readonly kind: 'reset' }
  | { readonly kind: 'error'; readonly message: string };

export interface SaveEvents {
  status: SaveStatus;
}

/** How the save system reaches the player in the world (provided by WorldScene). */
export interface PlayerLocator {
  getTile(): TilePos;
  teleport(tile: TilePos): void;
}

export interface InitialSave {
  readonly save?: SaveData;
  readonly warnings: readonly string[];
  readonly error?: string;
}

/** Reads the existing save before the game starts. Never throws: a bad save means a new game. */
export async function readInitialSave(
  storage: SaveStorage,
  content: GameContent,
): Promise<InitialSave> {
  try {
    const json = await storage.read();
    if (json === null) return { warnings: [] };
    const result = loadSave(json, content);
    return result.ok
      ? { save: result.save, warnings: result.warnings }
      : { warnings: [], error: result.error };
  } catch (e) {
    return { warnings: [], error: (e as Error).message };
  }
}

/**
 * Save / load / new game for the single local slot. Saves only what content cannot rebuild:
 * the GameState and the player's tile.
 */
export class SaveService extends Emitter<SaveEvents> {
  private player: PlayerLocator | null = null;
  private lastTile: TilePos;
  private _lastSavedAt: string | null;
  private autosaveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly storage: SaveStorage,
    private readonly session: GameSession,
    initial?: SaveData,
  ) {
    super();
    this.lastTile = initial?.player.tile ?? session.content.map.spawn;
    this._lastSavedAt = initial?.savedAt ?? null;
  }

  /** Tile the player should appear on when the world is (re)created. */
  get startTile(): TilePos {
    return this.lastTile;
  }

  get lastSavedAt(): string | null {
    return this._lastSavedAt;
  }

  attachPlayer(player: PlayerLocator): () => void {
    this.player = player;
    return () => {
      if (this.player !== player) return;
      this.lastTile = player.getTile();
      this.player = null;
    };
  }

  async save(): Promise<boolean> {
    if (this.player) this.lastTile = this.player.getTile();
    const data = createSave(this.session.state, this.lastTile);
    try {
      await this.storage.write(JSON.stringify(data));
    } catch (e) {
      this.emit('status', { kind: 'error', message: (e as Error).message });
      return false;
    }
    this._lastSavedAt = data.savedAt;
    this.emit('status', { kind: 'saved', at: data.savedAt });
    return true;
  }

  /** Restores the last save. Returns false (and reports why) if there is nothing usable. */
  async load(): Promise<boolean> {
    const { save, error } = await readInitialSave(this.storage, this.session.content);
    if (!save) {
      this.emit('status', { kind: 'error', message: error ?? 'No saved game yet' });
      return false;
    }
    this.lastTile = save.player.tile;
    this.session.replaceState(save.state);
    this.player?.teleport(save.player.tile);
    this.emit('status', { kind: 'loaded', at: save.savedAt });
    return true;
  }

  /** Deletes the save and starts over from the beginning. */
  async reset(): Promise<void> {
    this.cancelAutosave();
    try {
      await this.storage.clear();
    } catch (e) {
      this.emit('status', { kind: 'error', message: (e as Error).message });
    }
    this._lastSavedAt = null;
    this.lastTile = this.session.content.map.spawn;
    this.session.replaceState(newGameState(this.session.content));
    this.player?.teleport(this.lastTile);
    this.emit('status', { kind: 'reset' });
  }

  /** Saves shortly after any quest progress, coalescing bursts of notices into one write. */
  enableAutosave(delayMs = 500): () => void {
    const off = this.session.on('notice', () => {
      this.cancelAutosave();
      this.autosaveTimer = setTimeout(() => void this.save(), delayMs);
    });
    return () => {
      off();
      this.cancelAutosave();
    };
  }

  private cancelAutosave(): void {
    if (this.autosaveTimer !== undefined) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = undefined;
  }
}
