import {
  MEMORY_EVENTS,
  type FlagValue,
  type GameContent,
  type ItemStack,
  type MemoryEvent,
  type QuestStatus,
  type TilePos,
} from '../content/types';
import type { GameState, NpcMemory, QuestProgress } from '../state/gameState';
import { INVENTORY_SLOTS } from '../inventory/inventory';
import { isSolid, parseMap } from '../world/map';

/** Bump when the save shape changes, and add a migration from the previous version. */
export const SAVE_VERSION = 2;

/** Everything needed to resume a single-player game — and nothing derivable from content. */
export interface SaveData {
  readonly saveVersion: number;
  /** ISO timestamp, for display. */
  readonly savedAt: string;
  readonly state: GameState;
  readonly player: { readonly tile: TilePos };
}

type RawSave = Record<string, unknown>;

/** `migrations[n]` upgrades a version-n save to version n+1. */
export type SaveMigrations = Readonly<
  Record<number, (save: RawSave, content: GameContent) => RawSave>
>;

export const SAVE_MIGRATIONS: SaveMigrations = {
  /** v2 added money and the bag: players with older saves get the starting money and items. */
  1: (save, content) => {
    const state = isRecord(save.state) ? save.state : {};
    return {
      ...save,
      state: {
        ...state,
        money: content.economy.startingMoney,
        inventory: content.economy.startingItems,
      },
    };
  },
};

export type LoadResult =
  | { readonly ok: true; readonly save: SaveData; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly error: string };

export function createSave(state: GameState, playerTile: TilePos, now = new Date()): SaveData {
  return {
    saveVersion: SAVE_VERSION,
    savedAt: now.toISOString(),
    state,
    player: { tile: playerTile },
  };
}

/**
 * Parses, migrates and sanitises saved data. Never trusts the input: anything that no longer
 * matches the content (removed quests, NPCs, out-of-map positions) is dropped with a warning
 * rather than crashing the game.
 */
export function loadSave(
  json: string,
  content: GameContent,
  migrations: SaveMigrations = SAVE_MIGRATIONS,
  currentVersion: number = SAVE_VERSION,
): LoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Save data is not valid JSON' };
  }
  if (!isRecord(raw) || !Number.isInteger(raw.saveVersion) || (raw.saveVersion as number) < 1) {
    return { ok: false, error: 'Not a LIFE SHIFT save' };
  }

  let save: RawSave = raw;
  let version = raw.saveVersion as number;
  if (version > currentVersion) {
    return { ok: false, error: `Save is from a newer version (${version} > ${currentVersion})` };
  }
  while (version < currentVersion) {
    const migrate = migrations[version];
    if (!migrate) return { ok: false, error: `No migration from save version ${version}` };
    save = { ...migrate(save, content), saveVersion: version + 1 };
    version += 1;
  }

  const warnings: string[] = [];
  const state = sanitizeState(save.state, content, warnings);
  const tile = sanitizeTile(
    isRecord(save.player) ? save.player.tile : undefined,
    content,
    warnings,
  );
  return {
    ok: true,
    save: {
      saveVersion: currentVersion,
      savedAt: typeof save.savedAt === 'string' ? save.savedAt : new Date(0).toISOString(),
      state,
      player: { tile },
    },
    warnings,
  };
}

const QUEST_STATUSES: readonly QuestStatus[] = ['active', 'completed', 'failed'];

function sanitizeState(raw: unknown, content: GameContent, warnings: string[]): GameState {
  const input = isRecord(raw) ? raw : {};
  if (!isRecord(raw)) warnings.push('state missing; starting fresh');

  const flags: Record<string, FlagValue> = {};
  for (const [key, value] of Object.entries(isRecord(input.flags) ? input.flags : {})) {
    if (typeof value === 'boolean' || typeof value === 'string' || isFiniteNumber(value)) {
      flags[key] = value;
    } else warnings.push(`flag ${key}: unsupported value dropped`);
  }

  const quests: Record<string, QuestProgress> = {};
  for (const [id, value] of Object.entries(isRecord(input.quests) ? input.quests : {})) {
    const def = content.quests[id];
    if (!def) {
      warnings.push(`quest ${id}: no longer exists, dropped`);
      continue;
    }
    const status = isRecord(value) ? value.status : undefined;
    const index = isRecord(value) ? value.objectiveIndex : undefined;
    const max = def.objectives.length;
    if (
      !QUEST_STATUSES.includes(status as QuestStatus) ||
      !Number.isInteger(index) ||
      (index as number) < 0 ||
      (index as number) > max ||
      (status === 'completed') !== (index === max)
    ) {
      warnings.push(`quest ${id}: invalid progress dropped`);
      continue;
    }
    quests[id] = { status: status as QuestStatus, objectiveIndex: index as number };
  }

  const npcIds = new Set(content.npcs.map((n) => n.id));
  const memories: Record<string, NpcMemory[]> = {};
  for (const [npc, list] of Object.entries(isRecord(input.memories) ? input.memories : {})) {
    if (!npcIds.has(npc) || !Array.isArray(list)) {
      warnings.push(`memories of ${npc}: dropped`);
      continue;
    }
    memories[npc] = list.flatMap((m: unknown): NpcMemory[] => {
      if (!isRecord(m) || !MEMORY_EVENTS.includes(m.event as MemoryEvent)) return [];
      const event = m.event as MemoryEvent;
      return [typeof m.quest === 'string' ? { event, quest: m.quest } : { event }];
    });
  }

  let money = input.money;
  if (!Number.isInteger(money) || (money as number) < 0) {
    warnings.push('money invalid; set to 0');
    money = 0;
  }

  const inventory: ItemStack[] = [];
  for (const slot of Array.isArray(input.inventory) ? input.inventory : []) {
    const item =
      isRecord(slot) && typeof slot.item === 'string' ? content.items[slot.item] : undefined;
    const quantity = isRecord(slot) ? slot.quantity : undefined;
    if (!item || !Number.isInteger(quantity) || (quantity as number) < 1) {
      warnings.push('bag: invalid or unknown item dropped');
      continue;
    }
    const counted = inventory.filter((s) => content.items[s.item]?.category !== 'quest').length;
    if (item.category !== 'quest' && counted >= INVENTORY_SLOTS) {
      warnings.push(`bag: over ${INVENTORY_SLOTS} slots, ${item.id} dropped`);
      continue;
    }
    inventory.push({ item: item.id, quantity: Math.min(quantity as number, item.maxStack) });
  }

  return { flags, quests, memories, money: money as number, inventory };
}

function sanitizeTile(raw: unknown, content: GameContent, warnings: string[]): TilePos {
  const spawn = content.map.spawn;
  if (!isRecord(raw) || !Number.isInteger(raw.x) || !Number.isInteger(raw.y)) {
    warnings.push('player position missing; using spawn');
    return spawn;
  }
  const tile = { x: raw.x as number, y: raw.y as number };
  if (isSolid(parseMap(content.map), tile)) {
    warnings.push(`player position ${tile.x},${tile.y} is blocked; using spawn`);
    return spawn;
  }
  return tile;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
