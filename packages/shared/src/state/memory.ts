import type { MemoryEvent } from '../content/types';
import type { GameState, NpcMemory } from './gameState';

/** Keeps saves small and bounded; the oldest memories are forgotten first. */
export const MAX_MEMORIES_PER_NPC = 50;

export function memoriesOf(state: GameState, npc: string): readonly NpcMemory[] {
  return state.memories[npc] ?? [];
}

export function hasMemory(
  state: GameState,
  npc: string,
  event: MemoryEvent,
  quest?: string,
): boolean {
  return memoriesOf(state, npc).some(
    (m) => m.event === event && (quest === undefined || m.quest === quest),
  );
}

/**
 * Records a memory. Identical memories (same event and quest) are kept once, so repeating an
 * action does not grow the save; the memory moves to the end to mark it as the most recent.
 */
export function remember(state: GameState, npc: string, memory: NpcMemory): GameState {
  const existing = memoriesOf(state, npc);
  const last = existing.at(-1);
  if (last && last.event === memory.event && last.quest === memory.quest) return state;
  const others = existing.filter((m) => !(m.event === memory.event && m.quest === memory.quest));
  const entry: NpcMemory = memory.quest === undefined ? { event: memory.event } : memory;
  const next = [...others, entry].slice(-MAX_MEMORIES_PER_NPC);
  return { ...state, memories: { ...state.memories, [npc]: next } };
}
