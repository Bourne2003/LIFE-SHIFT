import type { Vec2 } from '../math/vector';
import type { QuestLog, QuestProgress } from '../quests/quests';
import type { Inventory, ItemCatalog } from '../items/items';
import {
  STARTING_MONEY,
  type GameState,
  type NpcMemory,
  type QuestCatalog,
} from '../state/gameState';

/** Bump when the save shape changes, and add a migration from the previous version. */
export const SAVE_VERSION = 2;

export interface SaveData {
  readonly version: number;
  /** ISO timestamp. */
  readonly savedAt: string;
  readonly state: GameState;
  /** Player feet position in world units, if known. */
  readonly player: Vec2 | null;
}

export type ParseResult =
  { readonly ok: true; readonly save: SaveData } | { readonly ok: false; readonly error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Upgraders from version N to N+1, applied in order to old saves. Each takes the raw object of
 * version N and returns the raw object of version N+1.
 */
const MIGRATIONS: Readonly<
  Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>
> = {
  // v2 added money and inventory: players continue with the starting purse and empty bags.
  1: (raw) => ({
    ...raw,
    version: 2,
    state: { ...(isRecord(raw.state) ? raw.state : {}), money: STARTING_MONEY, inventory: {} },
  }),
};

export function serializeSave(state: GameState, player: Vec2 | null, now = new Date()): string {
  const data: SaveData = { version: SAVE_VERSION, savedAt: now.toISOString(), state, player };
  return JSON.stringify(data);
}

/**
 * Reads a save written by any released version. Never throws: corrupt or foreign data is reported
 * as an error, and individual bad entries are dropped rather than failing the whole save, so a
 * player never loses everything to one bad field.
 */
export function parseSave(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (!isRecord(raw)) return { ok: false, error: 'not an object' };
  let version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return { ok: false, error: 'missing version' };
  if (version > SAVE_VERSION) return { ok: false, error: `made by a newer game (v${version})` };
  let data: Record<string, unknown> = raw;
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return { ok: false, error: `no migration from v${version}` };
    data = migrate(data);
    version += 1;
  }

  const state = isRecord(data.state) ? data.state : {};
  return {
    ok: true,
    save: {
      version: SAVE_VERSION,
      savedAt: typeof data.savedAt === 'string' ? data.savedAt : '',
      state: {
        quests: readQuests(state.quests),
        flags: readFlags(state.flags),
        npcs: readNpcs(state.npcs),
        money: readMoney(state.money),
        inventory: readInventory(state.inventory),
      },
      player: readPoint(data.player),
    },
  };
}

function readQuests(raw: unknown): QuestLog {
  const out: Record<string, QuestProgress> = {};
  if (!isRecord(raw)) return out;
  for (const [id, p] of Object.entries(raw)) {
    if (!isRecord(p)) continue;
    if (p.status === 'completed') out[id] = { status: 'completed' };
    else if (p.status === 'active' && typeof p.step === 'string')
      out[id] = { status: 'active', step: p.step };
  }
  return out;
}

function readFlags(raw: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!isRecord(raw)) return out;
  for (const [flag, v] of Object.entries(raw)) if (typeof v === 'boolean') out[flag] = v;
  return out;
}

function readNpcs(raw: unknown): Record<string, NpcMemory> {
  const out: Record<string, NpcMemory> = {};
  if (!isRecord(raw)) return out;
  for (const [id, m] of Object.entries(raw)) {
    const talks = isRecord(m) ? m.talks : undefined;
    if (typeof talks === 'number' && Number.isInteger(talks) && talks >= 0) out[id] = { talks };
  }
  return out;
}

function readMoney(raw: unknown): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : STARTING_MONEY;
}

function readInventory(raw: unknown): Inventory {
  const out: Record<string, number> = {};
  if (!isRecord(raw)) return out;
  for (const [id, n] of Object.entries(raw))
    if (typeof n === 'number' && Number.isInteger(n) && n > 0) out[id] = n;
  return out;
}

function readPoint(raw: unknown): Vec2 | null {
  if (!isRecord(raw)) return null;
  const { x, y } = raw;
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)
    ? { x, y }
    : null;
}

/**
 * Makes a loaded state consistent with the current content: quests and items that no longer
 * exist are dropped, and an active quest whose step was removed restarts at its first step.
 */
export function reconcileState(
  state: GameState,
  content: { readonly quests: QuestCatalog; readonly items: ItemCatalog },
): GameState {
  const { quests, items } = content;
  const inventory = Object.fromEntries(Object.entries(state.inventory).filter(([id]) => items[id]));
  const fixed: Record<string, QuestProgress> = {};
  for (const [id, progress] of Object.entries(state.quests)) {
    const quest = quests[id];
    if (!quest) continue;
    if (progress.status === 'active' && !quest.steps.some((s) => s.id === progress.step)) {
      const first = quest.steps[0];
      if (first) fixed[id] = { status: 'active', step: first.id };
    } else fixed[id] = progress;
  }
  return { ...state, quests: fixed, inventory };
}
