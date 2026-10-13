import type Phaser from 'phaser';
import type { ConversationView } from '../game/session';
import { TEXT_STYLE } from './style';

const MAX_WIDTH = 720;
const MARGIN = 16;
const PAD = 16;
const GAP = 8;

/**
 * Conversation panel along the bottom of the screen: speaker, line and choices. Purely a view;
 * it reports taps through callbacks and never changes story state itself.
 */
export class DialogueBox {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private choices: Phaser.GameObjects.Text[] = [];
  private view: ConversationView | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly handlers: { onContinue(): void; onChoose(index: number): void },
    private readonly continueHint: string,
  ) {
    this.panel = scene.add
      .rectangle(0, 0, 10, 10, 0x101820, 0.88)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setOrigin(0)
      .setInteractive();
    this.panel.on('pointerdown', () => {
      if (this.view && this.view.choices.length === 0) this.handlers.onContinue();
    });
    this.speaker = scene.add.text(0, 0, '', { ...TEXT_STYLE, color: '#ffd479', fontStyle: 'bold' });
    this.body = scene.add.text(0, 0, '', { ...TEXT_STYLE, lineSpacing: 4 });
    this.hint = scene.add
      .text(0, 0, continueHint, { ...TEXT_STYLE, fontSize: '14px', color: '#bbbbbb' })
      .setOrigin(1, 0);
    this.render(null);
  }

  /** Bounds of each choice in screen space (for tests and hit areas). */
  get choiceBounds(): { x: number; y: number; width: number; height: number }[] {
    return this.choices.map((c) => ({ x: c.x, y: c.y, width: c.width, height: c.height }));
  }

  render(view: ConversationView | null): void {
    this.view = view;
    for (const c of this.choices) c.destroy();
    this.choices = [];
    const visible = view !== null;
    for (const o of [this.panel, this.speaker, this.body, this.hint]) o.setVisible(visible);
    if (!view) return;

    this.speaker.setText(view.speaker);
    this.body.setText(view.text);
    this.hint.setVisible(view.choices.length === 0);
    this.choices = view.choices.map((text, i) => {
      const selected = i === view.selected;
      const choice = this.scene.add
        .text(0, 0, `${selected ? '▶' : '  '} ${text}`, {
          ...TEXT_STYLE,
          color: selected ? '#ffd479' : '#ffffff',
          padding: { x: 4, y: 4 },
        })
        .setInteractive({ useHandCursor: true });
      choice.on('pointerdown', () => this.handlers.onChoose(i));
      return choice;
    });
    this.layout();
  }

  /** Re-flows the panel for the current screen size. */
  layout(): void {
    const { width, height } = this.scene.scale;
    const panelW = Math.min(width - MARGIN * 2, MAX_WIDTH);
    const innerW = panelW - PAD * 2;
    const left = (width - panelW) / 2;
    this.body.setWordWrapWidth(innerW, true);
    for (const c of this.choices) c.setWordWrapWidth(innerW, true);

    const contentH =
      this.speaker.height +
      GAP +
      this.body.height +
      this.choices.reduce((h, c) => h + GAP + c.height, 0) +
      (this.hint.visible ? GAP + this.hint.height : 0);
    const panelH = contentH + PAD * 2;
    const top = height - MARGIN - panelH;

    this.panel.setPosition(left, top).setSize(panelW, panelH);
    this.panel.input?.hitArea.setTo(0, 0, panelW, panelH);
    let y = top + PAD;
    this.speaker.setPosition(left + PAD, y);
    y += this.speaker.height + GAP;
    this.body.setPosition(left + PAD, y);
    y += this.body.height;
    for (const c of this.choices) {
      y += GAP;
      c.setPosition(left + PAD, y);
      y += c.height;
    }
    this.hint.setPosition(left + panelW - PAD, y + GAP);
  }
}
