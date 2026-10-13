import {
  advanceDialogue,
  beginDialogue,
  currentStep,
  selectNpcDialogue,
  type DialogueDef,
  type GameContent,
  type NpcDef,
  type QuestLog,
} from '@life-shift/shared';

/** What the dialogue UI shows. */
export interface ConversationView {
  readonly npcId: string;
  readonly speaker: string;
  readonly text: string;
  readonly choices: readonly string[];
  /** Highlighted choice; meaningful only when there are choices. */
  readonly selected: number;
}

export interface TrackedQuest {
  readonly id: string;
  readonly title: string;
  readonly step: string;
}

export type SessionEvent =
  | { readonly type: 'changed' }
  | {
      readonly type: 'questStarted' | 'questCompleted';
      readonly quest: string;
      readonly title: string;
    };

interface Conversation {
  readonly npc: NpcDef;
  readonly dialogue: DialogueDef;
  readonly node: string;
  readonly selected: number;
}

/**
 * Single-player story state for one game: quest progress, the NPC in reach and the open
 * conversation. Scenes talk to it instead of to each other; the world scene feeds it player
 * actions and the UI scene renders it. Engine-free so it is unit tested in Node. Quest rules live
 * in `@life-shift/shared`, so a future server can run the same logic.
 */
export class GameSession {
  private _quests: QuestLog = {};
  private nearby: NpcDef | null = null;
  private convo: Conversation | null = null;
  private readonly listeners = new Set<(event: SessionEvent) => void>();
  private readonly npcsById: ReadonlyMap<string, NpcDef>;

  constructor(private readonly content: GameContent) {
    this.npcsById = new Map(content.npcs.map((n) => [n.id, n]));
  }

  get quests(): QuestLog {
    return this._quests;
  }

  get nearbyNpc(): { readonly id: string; readonly name: string } | null {
    return this.nearby;
  }

  get inConversation(): boolean {
    return this.convo !== null;
  }

  get conversation(): ConversationView | null {
    const c = this.convo;
    if (!c) return null;
    const node = c.dialogue.nodes[c.node]!;
    return {
      npcId: c.npc.id,
      speaker: node.speaker ?? c.npc.name,
      text: node.text,
      choices: node.choices?.map((ch) => ch.text) ?? [],
      selected: c.selected,
    };
  }

  /** Active quests with the description of their current step, for the HUD. */
  get trackedQuests(): TrackedQuest[] {
    return Object.values(this.content.quests).flatMap((quest) => {
      const stepId = currentStep(this._quests, quest.id);
      const step = quest.steps.find((s) => s.id === stepId);
      return step ? [{ id: quest.id, title: quest.title, step: step.description }] : [];
    });
  }

  /** Subscribes to changes; returns an unsubscribe function. */
  on(listener: (event: SessionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setNearbyNpc(id: string | null): void {
    const npc = id === null ? null : (this.npcsById.get(id) ?? null);
    if (npc === this.nearby) return;
    this.nearby = npc;
    this.emit({ type: 'changed' });
  }

  /** Starts talking to an NPC. Returns false if it does not exist or a conversation is open. */
  talkTo(npcId: string): boolean {
    const npc = this.npcsById.get(npcId);
    if (!npc || this.convo) return false;
    const dialogueId = selectNpcDialogue(npc, this._quests);
    const dialogue = dialogueId === undefined ? undefined : this.content.dialogues[dialogueId];
    if (!dialogue) return false;
    const step = beginDialogue(dialogue, this._quests, this.content.quests);
    this.update(step.log, { npc, dialogue, node: step.node!, selected: 0 });
    return true;
  }

  /** Continues the conversation, confirming the highlighted choice if the line has choices. */
  advance(): void {
    const c = this.convo;
    if (!c) return;
    const hasChoices = !!c.dialogue.nodes[c.node]?.choices?.length;
    this.step(c, hasChoices ? c.selected : undefined);
  }

  /** Picks a choice directly (e.g. tapped). Ignored if the current line has no such choice. */
  choose(index: number): void {
    const c = this.convo;
    const count = c ? (c.dialogue.nodes[c.node]?.choices?.length ?? 0) : 0;
    if (c && Number.isInteger(index) && index >= 0 && index < count) this.step(c, index);
  }

  /** Moves the choice highlight, wrapping around. */
  moveSelection(delta: number): void {
    const c = this.convo;
    const count = c ? (c.dialogue.nodes[c.node]?.choices?.length ?? 0) : 0;
    if (!c || count === 0) return;
    const selected = (((c.selected + delta) % count) + count) % count;
    this.update(this._quests, { ...c, selected });
  }

  private step(c: Conversation, choice: number | undefined): void {
    const next = advanceDialogue(c.dialogue, c.node, this._quests, this.content.quests, choice);
    this.update(next.log, next.node === null ? null : { ...c, node: next.node, selected: 0 });
  }

  private update(log: QuestLog, convo: Conversation | null): void {
    const before = this._quests;
    this._quests = log;
    this.convo = convo;
    this.emit({ type: 'changed' });
    for (const quest of Object.values(this.content.quests)) {
      const was = before[quest.id]?.status;
      const now = log[quest.id]?.status;
      if (was === now) continue;
      if (now === 'active')
        this.emit({ type: 'questStarted', quest: quest.id, title: quest.title });
      if (now === 'completed')
        this.emit({ type: 'questCompleted', quest: quest.id, title: quest.title });
    }
  }

  private emit(event: SessionEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
