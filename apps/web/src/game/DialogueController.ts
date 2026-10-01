import {
  advanceDialogue,
  availableChoices,
  beginDialogue,
  chooseDialogueOption,
  getNode,
  selectDialogue,
  type DialogueCursor,
  type DialogueStep,
  type NpcDef,
} from '@life-shift/shared';
import { Emitter } from './events';
import type { GameSession } from './GameSession';

/** What the UI needs to draw the current line of a conversation. */
export interface DialogueView {
  readonly npc: string;
  readonly speaker: string;
  readonly text: string;
  /** Empty when the line is waiting for "continue" instead of a choice. */
  readonly choices: readonly { readonly index: number; readonly text: string }[];
}

export interface DialogueEvents {
  /** null when the conversation closes. */
  change: DialogueView | null;
}

/** Runs one conversation at a time against the session's state. */
export class DialogueController extends Emitter<DialogueEvents> {
  private cursor: DialogueCursor | null = null;
  private npc: NpcDef | null = null;

  constructor(private readonly session: GameSession) {
    super();
  }

  get active(): boolean {
    return this.cursor !== null;
  }

  /** Starts talking to `npc`. Returns false if they have nothing to say. */
  start(npc: NpcDef): boolean {
    const { content } = this.session;
    // Pick the dialogue before reporting the talk, so lines can react to the objective that
    // this very conversation completes (e.g. "Ken, Noi sent me").
    const dialogue = selectDialogue(npc, this.session.state, content);
    if (!dialogue) return false;
    this.npc = npc;
    this.session.questEvent({ type: 'talk', npc: npc.id });
    this.apply(beginDialogue(dialogue, content));
    return true;
  }

  /** "Continue": ignored while the current line is waiting for a choice. */
  advance(): void {
    if (!this.cursor) return;
    const step = advanceDialogue(this.cursor, this.session.state, this.session.content);
    if (step) this.apply(step);
  }

  choose(index: number): void {
    if (!this.cursor) return;
    const step = chooseDialogueOption(this.cursor, index, this.session.state, this.session.content);
    if (step) this.apply(step);
  }

  close(): void {
    if (!this.cursor) return;
    this.cursor = null;
    this.npc = null;
    this.emit('change', null);
  }

  view(): DialogueView | null {
    if (!this.cursor || !this.npc) return null;
    const { content, state } = this.session;
    const node = getNode(content, this.cursor);
    return {
      npc: this.npc.id,
      speaker: this.speakerName(node.speaker),
      text: node.text,
      choices: availableChoices(node, state, content).map(({ index, choice }) => ({
        index,
        text: choice.text,
      })),
    };
  }

  private apply(step: DialogueStep): void {
    this.session.applyEffects(step.effects);
    if (!step.cursor) return this.close();
    this.cursor = step.cursor;
    this.emit('change', this.view());
  }

  private speakerName(speaker: string | undefined): string {
    if (speaker === 'player') return 'You';
    const id = speaker ?? this.npc?.id;
    return this.session.content.npcs.find((n) => n.id === id)?.name ?? '';
  }
}
