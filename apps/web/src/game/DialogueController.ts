import {
  advanceDialogue,
  availableChoices,
  beginDialogue,
  chooseDialogueOption,
  getNode,
  selectDialogue,
  type DialogueCursor,
  type DialogueStep,
  type NpcDialogueRef,
} from '@life-shift/shared';
import { Emitter } from './events';
import type { GameSession } from './GameSession';

/** Anything the player can start a conversation with: an NPC, or an object like a sign. */
export interface Talker {
  readonly kind: 'npc' | 'object';
  readonly id: string;
  readonly name: string;
  readonly dialogues: readonly NpcDialogueRef[];
}

/** What the UI needs to draw the current line of a conversation. */
export interface DialogueView {
  /** Id of the NPC or object being talked to. */
  readonly with: string;
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
  private talker: Talker | null = null;

  constructor(private readonly session: GameSession) {
    super();
  }

  get active(): boolean {
    return this.cursor !== null;
  }

  /** Starts talking to `talker`. Returns false if they have nothing to say. */
  start(talker: Talker): boolean {
    const { content } = this.session;
    // Pick the dialogue before reporting the talk, so lines can react to the objective that
    // this very conversation completes (e.g. "Ken, Noi sent me") and to a first meeting.
    const dialogue = selectDialogue(talker, this.session.state, content);
    if (!dialogue) return false;
    this.talker = talker;
    if (talker.kind === 'npc') this.session.handleEvent({ type: 'talk', npc: talker.id });
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
    this.talker = null;
    this.emit('change', null);
  }

  view(): DialogueView | null {
    if (!this.cursor || !this.talker) return null;
    const { content, state } = this.session;
    const node = getNode(content, this.cursor);
    return {
      with: this.talker.id,
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
    if (speaker === undefined) return this.talker?.name ?? '';
    return this.session.content.npcs.find((n) => n.id === speaker)?.name ?? '';
  }
}

/** Adapts content definitions to Talkers. */
export const talkerFromNpc = (npc: {
  id: string;
  name: string;
  dialogues: readonly NpcDialogueRef[];
}): Talker => ({ kind: 'npc', id: npc.id, name: npc.name, dialogues: npc.dialogues });

export const talkerFromObject = (object: {
  id: string;
  name: string;
  dialogues: readonly NpcDialogueRef[];
}): Talker => ({ kind: 'object', id: object.id, name: object.name, dialogues: object.dialogues });
