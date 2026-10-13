import {
  advanceDialogue,
  beginDialogue,
  INITIAL_STATE,
  buyItem,
  currentStep,
  isPropVisible,
  reconcileState,
  recordTalk,
  selectNpcDialogue,
  type DialogueDef,
  type GameContent,
  type GameState,
  type LocalizedText,
  type NpcDef,
  type QuestLog,
  type ShopDef,
  type WorldPropDef,
} from '@life-shift/shared';

/** What the dialogue UI shows. */
export interface ConversationView {
  readonly npcId: string;
  readonly speaker: LocalizedText;
  readonly text: LocalizedText;
  readonly choices: readonly LocalizedText[];
  /** Highlighted choice; meaningful only when there are choices. */
  readonly selected: number;
}

export interface TrackedQuest {
  readonly id: string;
  readonly title: LocalizedText;
  readonly step: LocalizedText;
}

/** What the shop UI shows. */
export interface ShopView {
  readonly shopId: string;
  readonly name: LocalizedText;
  readonly money: number;
  readonly entries: readonly {
    readonly item: string;
    readonly name: LocalizedText;
    readonly description: LocalizedText;
    readonly price: number;
    readonly owned: number;
    readonly affordable: boolean;
  }[];
  readonly selected: number;
}

export interface InventoryEntry {
  readonly item: string;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly count: number;
}

export type SessionEvent =
  /** Anything the UI shows changed (nearby NPC, conversation, game state). */
  | { readonly type: 'changed' }
  /** The persistent game state changed: worth saving, and the world may need redrawing. */
  | { readonly type: 'stateChanged' }
  | {
      readonly type: 'questStarted' | 'questCompleted';
      readonly quest: string;
      readonly title: LocalizedText;
    }
  | { readonly type: 'purchased'; readonly item: LocalizedText; readonly price: number }
  | { readonly type: 'cannotAfford'; readonly item: LocalizedText }
  /** Money went up (e.g. a quest reward). */
  | { readonly type: 'moneyReceived'; readonly amount: number };

interface Conversation {
  readonly npc: NpcDef;
  readonly dialogue: DialogueDef;
  readonly node: string;
  readonly selected: number;
}

/**
 * Single-player story state for one game: the persistent GameState (quests, world flags, NPC
 * memory) plus the NPC in reach and the open conversation. Scenes talk to it instead of to each other; the world scene feeds it player
 * actions and the UI scene renders it. Engine-free so it is unit tested in Node. Quest rules live
 * in `@life-shift/shared`, so a future server can run the same logic. Text is returned in every
 * language (LocalizedText) and the UI picks one, so switching language never touches story state.
 */
export class GameSession {
  private _state: GameState;
  private nearby: NpcDef | null = null;
  private convo: Conversation | null = null;
  private shop: { readonly def: ShopDef; readonly selected: number } | null = null;
  private _inventoryOpen = false;
  private readonly listeners = new Set<(event: SessionEvent) => void>();
  private readonly npcsById: ReadonlyMap<string, NpcDef>;

  /** `initial` is typically a loaded save; it is reconciled with the current content. */
  constructor(
    private readonly content: GameContent,
    initial: GameState = INITIAL_STATE,
  ) {
    this.npcsById = new Map(content.npcs.map((n) => [n.id, n]));
    this._state = reconcileState(initial, content);
  }

  /** The persistent game state (what a save contains). */
  get state(): GameState {
    return this._state;
  }

  get quests(): QuestLog {
    return this._state.quests;
  }

  /** World props that should be shown in the current state. */
  get visibleProps(): WorldPropDef[] {
    return this.content.props.filter((p) => isPropVisible(p, this._state));
  }

  get nearbyNpc(): { readonly id: string; readonly name: LocalizedText } | null {
    return this.nearby;
  }

  get inConversation(): boolean {
    return this.convo !== null;
  }

  get inShop(): boolean {
    return this.shop !== null;
  }

  get inventoryOpen(): boolean {
    return this._inventoryOpen;
  }

  get shopView(): ShopView | null {
    if (!this.shop) return null;
    const { def, selected } = this.shop;
    const { money, inventory } = this._state;
    return {
      shopId: def.id,
      name: def.name,
      money,
      selected,
      entries: def.stock.map(({ item, price }) => {
        const itemDef = this.content.items[item]!;
        return {
          item,
          name: itemDef.name,
          description: itemDef.description,
          price,
          owned: inventory[item] ?? 0,
          affordable: money >= price,
        };
      }),
    };
  }

  /** What the player carries, in catalogue order. */
  get inventory(): InventoryEntry[] {
    return Object.values(this.content.items).flatMap((item) => {
      const count = this._state.inventory[item.id] ?? 0;
      return count > 0
        ? [{ item: item.id, name: item.name, description: item.description, count }]
        : [];
    });
  }

  toggleInventory(open = !this._inventoryOpen): void {
    if (open === this._inventoryOpen) return;
    this._inventoryOpen = open;
    this.emit({ type: 'changed' });
  }

  openShop(shopId: string): boolean {
    const def = this.content.shops[shopId];
    if (!def || this.convo) return false;
    this.shop = { def, selected: 0 };
    this._inventoryOpen = false;
    this.emit({ type: 'changed' });
    return true;
  }

  closeShop(): void {
    if (!this.shop) return;
    this.shop = null;
    this.emit({ type: 'changed' });
  }

  /** Highlights a shop entry (e.g. tapped). */
  selectShopEntry(index: number): void {
    if (!this.shop || !Number.isInteger(index)) return;
    if (index < 0 || index >= this.shop.def.stock.length) return;
    this.shop = { ...this.shop, selected: index };
    this.emit({ type: 'changed' });
  }

  /** Buys one of the highlighted shop entry. */
  buySelected(): void {
    const shop = this.shop;
    const entry = shop?.def.stock[shop.selected];
    if (!shop || !entry) return;
    const name = this.content.items[entry.item]!.name;
    const result = buyItem(this._state, shop.def, entry.item);
    if (!result.ok) {
      this.emit({ type: 'cannotAfford', item: name });
      return;
    }
    this.commit(result.state);
    this.emit({ type: 'purchased', item: name, price: result.price });
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
      const stepId = currentStep(this._state.quests, quest.id);
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
    // Choose the dialogue before remembering this talk, so a first meeting is a first meeting.
    const dialogueId = selectNpcDialogue(npc, this._state);
    const dialogue = dialogueId === undefined ? undefined : this.content.dialogues[dialogueId];
    if (!dialogue) return false;
    const met = recordTalk(this._state, npc.id);
    const step = beginDialogue(dialogue, met, this.content.quests);
    this.update(step.state, { npc, dialogue, node: step.node!, selected: 0 });
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

  /** Moves the highlight (dialogue choice or shop entry), wrapping around. */
  moveSelection(delta: number): void {
    if (this.shop) {
      const count = this.shop.def.stock.length;
      const selected = (((this.shop.selected + delta) % count) + count) % count;
      this.shop = { ...this.shop, selected };
      this.emit({ type: 'changed' });
      return;
    }
    const c = this.convo;
    const count = c ? (c.dialogue.nodes[c.node]?.choices?.length ?? 0) : 0;
    if (!c || count === 0) return;
    const selected = (((c.selected + delta) % count) + count) % count;
    this.update(this._state, { ...c, selected });
  }

  private step(c: Conversation, choice: number | undefined): void {
    const chosen = choice === undefined ? undefined : c.dialogue.nodes[c.node]?.choices?.[choice];
    const next = advanceDialogue(c.dialogue, c.node, this._state, this.content.quests, choice);
    this.update(next.state, next.node === null ? null : { ...c, node: next.node, selected: 0 });
    if (chosen?.opensShop && next.node === null) this.openShop(chosen.opensShop);
  }

  private update(state: GameState, convo: Conversation | null): void {
    this.convo = convo;
    this.commit(state);
  }

  /** Replaces the game state and announces what changed. */
  private commit(state: GameState): void {
    const before = this._state;
    this._state = state;
    this.emit({ type: 'changed' });
    if (state === before) return;
    if (state.money > before.money)
      this.emit({ type: 'moneyReceived', amount: state.money - before.money });
    this.emit({ type: 'stateChanged' });
    for (const quest of Object.values(this.content.quests)) {
      const was = before.quests[quest.id]?.status;
      const now = state.quests[quest.id]?.status;
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
