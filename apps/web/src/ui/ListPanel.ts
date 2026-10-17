import type Phaser from 'phaser';
import { TEXT_STYLE, setSmartWrap } from './style';

export interface ListRow {
  readonly label: string;
  /** Right-aligned detail, e.g. a price or a count. */
  readonly detail?: string;
  /** Greyed out, e.g. something the player cannot afford. */
  readonly dim?: boolean;
}

export interface ListPanelContent {
  readonly title: string;
  /** Right side of the title bar, e.g. the player's money. */
  readonly titleDetail?: string;
  readonly rows: readonly ListRow[];
  /** Highlighted row, or null for a list without selection. */
  readonly selected: number | null;
  /** Shown (dimmed) instead of rows when there are none; '' shows nothing. */
  readonly emptyText: string;
  /** Wrapped text under the rows, e.g. the selected item's description. */
  readonly note?: string;
  /** Small hint at the bottom (controls). */
  readonly hint?: string;
  readonly buttons: readonly { readonly label: string; onPress(): void }[];
}

const MAX_WIDTH = 520;
const MARGIN = 16;
const PAD = 16;
const GAP = 8;
const TOP = 72;
const HIGHLIGHT = '#ffd479';
/** Above HUD labels (hints, tracker), below toasts. */
export const PANEL_DEPTH = 100;

/**
 * A centred modal list (shop stock, bag contents). Purely a view: rows and buttons report taps
 * through callbacks; game state is changed by whoever owns the callbacks.
 */
export class ListPanel {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly titleDetail: Phaser.GameObjects.Text;
  private readonly note: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private parts: Phaser.GameObjects.Text[] = [];
  private rows: { label: Phaser.GameObjects.Text; detail: Phaser.GameObjects.Text }[] = [];
  private buttons: Phaser.GameObjects.Text[] = [];
  private visible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly locale: () => string,
    private readonly onRowTap: (index: number) => void,
  ) {
    // Interactive so taps on the panel never fall through to the joystick or the world.
    this.panel = scene.add
      .rectangle(0, 0, 10, 10, 0x101820, 1)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setOrigin(0)
      .setInteractive();
    this.title = scene.add.text(0, 0, '', { ...TEXT_STYLE, fontStyle: 'bold', color: HIGHLIGHT });
    this.titleDetail = scene.add.text(0, 0, '', TEXT_STYLE).setOrigin(1, 0);
    this.note = setSmartWrap(
      scene.add.text(0, 0, '', { ...TEXT_STYLE, fontSize: '16px', color: '#dddddd' }),
      MAX_WIDTH,
      locale,
    );
    this.hint = scene.add.text(0, 0, '', { ...TEXT_STYLE, fontSize: '14px', color: '#bbbbbb' });
    for (const o of [this.panel, this.title, this.titleDetail, this.note, this.hint])
      o.setDepth(PANEL_DEPTH);
    this.render(null);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** Screen-space centres of rows and buttons, for tests. */
  get hitPoints(): { rows: { x: number; y: number }[]; buttons: { x: number; y: number }[] } {
    const centre = (t: Phaser.GameObjects.Text) => {
      const b = t.getBounds();
      return { x: b.centerX, y: b.centerY };
    };
    return { rows: this.rows.map((r) => centre(r.label)), buttons: this.buttons.map(centre) };
  }

  render(content: ListPanelContent | null): void {
    for (const t of this.parts) t.destroy();
    this.parts = [];
    this.rows = [];
    this.buttons = [];
    this.visible = content !== null;
    for (const o of [this.panel, this.title, this.titleDetail, this.note, this.hint])
      o.setVisible(this.visible);
    if (!content) return;

    this.title.setText(content.title);
    this.titleDetail.setText(content.titleDetail ?? '');
    this.note.setText(content.note ?? '').setVisible(!!content.note);
    this.hint.setText(content.hint ?? '').setVisible(!!content.hint);

    const items: readonly ListRow[] = content.rows.length
      ? content.rows
      : content.emptyText
        ? [{ label: content.emptyText, dim: true }]
        : [];
    this.rows = items.map((row, i) => {
      const selected = content.rows.length > 0 && i === content.selected;
      const color = selected ? HIGHLIGHT : row.dim ? '#8a8a8a' : '#ffffff';
      const prefix =
        content.selected === null || !content.rows.length ? '' : selected ? '▶ ' : '   ';
      const label = this.scene.add.text(0, 0, prefix + row.label, {
        ...TEXT_STYLE,
        color,
        padding: { x: 0, y: 6 },
      });
      const detail = this.scene.add
        .text(0, 0, row.detail ?? '', { ...TEXT_STYLE, color, padding: { x: 0, y: 6 } })
        .setOrigin(1, 0);
      if (content.rows.length) {
        label.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.onRowTap(i));
      }
      label.setDepth(PANEL_DEPTH);
      detail.setDepth(PANEL_DEPTH);
      this.parts.push(label, detail);
      return { label, detail };
    });
    this.buttons = content.buttons.map((b) => {
      const button = this.scene.add
        .text(0, 0, b.label, {
          ...TEXT_STYLE,
          fontStyle: 'bold',
          backgroundColor: '#ffffff26',
          padding: { x: 14, y: 8 },
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => b.onPress())
        .setDepth(PANEL_DEPTH);
      this.parts.push(button);
      return button;
    });
    this.layout();
  }

  layout(): void {
    if (!this.visible) return;
    const { width } = this.scene.scale;
    const panelW = Math.min(width - MARGIN * 2, MAX_WIDTH);
    const left = (width - panelW) / 2;
    const right = left + panelW - PAD;
    const innerW = panelW - PAD * 2;

    let y = TOP + PAD;
    this.title.setPosition(left + PAD, y);
    this.titleDetail.setPosition(right, y);
    y += this.title.height + GAP;
    for (const { label, detail } of this.rows) {
      label.setPosition(left + PAD, y);
      detail.setPosition(right, y);
      // Make the whole row tappable, not just its text.
      label.input?.hitArea.setTo(0, 0, innerW - detail.width, label.height);
      y += label.height;
    }
    if (this.note.visible) {
      this.note.setWordWrapWidth(innerW).setPosition(left + PAD, y + GAP);
      y += GAP + this.note.height;
    }
    if (this.buttons.length) {
      y += GAP * 2;
      let x = right;
      for (const b of [...this.buttons].reverse()) {
        b.setPosition(x, y);
        x -= b.width + GAP;
      }
      y += Math.max(...this.buttons.map((b) => b.height));
    }
    if (this.hint.visible) {
      this.hint.setPosition(left + PAD, y + GAP);
      y += GAP + this.hint.height;
    }
    const panelH = y + PAD - TOP;
    this.panel.setPosition(left, TOP).setSize(panelW, panelH);
    this.panel.input?.hitArea.setTo(0, 0, panelW, panelH);
  }
}
