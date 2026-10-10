export const WORLD_MEMORY_VERSION = 1;
export const WORLD_MEMORY_KEY = 'life-shift.world-memory';

export interface WorldMemory {
  readonly version: typeof WORLD_MEMORY_VERSION;
  readonly questState: string;
  readonly discoveredLandmarks: readonly string[];
  readonly player: { readonly x: number; readonly y: number };
}

export interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadWorldMemory(
  storage: MemoryStorage | undefined = safeLocalStorage(),
): WorldMemory | undefined {
  if (!storage) return undefined;
  try {
    const value: unknown = JSON.parse(storage.getItem(WORLD_MEMORY_KEY) ?? 'null');
    if (!isWorldMemory(value)) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

export function saveWorldMemory(
  memory: WorldMemory,
  storage: MemoryStorage | undefined = safeLocalStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(WORLD_MEMORY_KEY, JSON.stringify(memory));
    return true;
  } catch {
    return false;
  }
}

function isWorldMemory(value: unknown): value is WorldMemory {
  if (!value || typeof value !== 'object') return false;
  const memory = value as Partial<WorldMemory>;
  return (
    memory.version === WORLD_MEMORY_VERSION &&
    typeof memory.questState === 'string' &&
    Array.isArray(memory.discoveredLandmarks) &&
    memory.discoveredLandmarks.every((id) => typeof id === 'string') &&
    !!memory.player &&
    Number.isFinite(memory.player.x) &&
    Number.isFinite(memory.player.y)
  );
}

function safeLocalStorage(): MemoryStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
