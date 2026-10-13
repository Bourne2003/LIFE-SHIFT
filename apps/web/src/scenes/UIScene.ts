import Phaser from 'phaser';
import { SceneKeys } from '../game/sceneKeys';
import { getServices } from '../game/services';
import type { GameSession, SessionEvent } from '../game/session';
import type { LocaleService } from '../i18n/LocaleService';
import { TouchActionButton } from '../input/TouchActionButton';
import { TouchJoystick } from '../input/TouchJoystick';
import { DialogueBox } from '../ui/DialogueBox';
import { TEXT_STYLE, setSmartWrap } from '../ui/style';

const MARGIN = 16;
const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  ...TEXT_STYLE,
  backgroundColor: '#00000080',
  padding: { x: 10, y: 6 },
};

/**
 * Screen-space overlay drawn above the world with an unzoomed camera: touch controls, the
 * language switch, the interaction prompt, the dialogue box and the quest tracker. It renders the
 * GameSession in the current language and never changes the world directly.
 */
export class UIScene extends Phaser.Scene {
  private session!: GameSession;
  private i18n!: LocaleService;
  private touch = false;
  private actionButton: TouchActionButton | null = null;
  private languageButton!: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private tracker!: Phaser.GameObjects.Text;
  private dialogue!: DialogueBox;

  constructor() {
    super(SceneKeys.UI);
  }

  /** On-screen interact button (touch devices only), for tests. */
  get interactButton(): TouchActionButton | null {
    return this.actionButton;
  }

  /** Centre of the language switch in screen space, for tests. */
  get languageButtonCenter(): { x: number; y: number } {
    const b = this.languageButton.getBounds();
    return { x: b.centerX, y: b.centerY };
  }

  create(): void {
    const { input, session, i18n } = getServices(this);
    this.session = session;
    this.i18n = i18n;
    this.touch = this.sys.game.device.input.touch;
    const cleanups: (() => void)[] = [];

    cleanups.push(input.add(new TouchJoystick(this)));
    if (this.touch) {
      this.actionButton = new TouchActionButton(this);
      cleanups.push(input.add(this.actionButton));
    }

    this.languageButton = this.add
      .text(MARGIN, MARGIN, '', { ...LABEL_STYLE, fontStyle: 'bold' })
      .setInteractive({ useHandCursor: true });
    this.languageButton.on('pointerdown', () => i18n.cycle());

    this.prompt = this.add.text(0, 0, '', LABEL_STYLE).setOrigin(0.5, 1).setVisible(false);
    this.tracker = setSmartWrap(
      this.add.text(0, 0, '', LABEL_STYLE).setOrigin(1, 0).setVisible(false),
      320,
      () => i18n.locale,
    );
    this.dialogue = new DialogueBox(
      this,
      { onContinue: () => session.advance(), onChoose: (i) => session.choose(i) },
      i18n,
      this.touch,
    );

    this.showHint();
    cleanups.push(session.on((event) => this.onSessionEvent(event)));
    cleanups.push(i18n.on(() => this.render()));
    this.render();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    cleanups.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cleanups.forEach((c) => c()));
  }

  private onSessionEvent(event: SessionEvent): void {
    if (event.type === 'changed') return this.render();
    const title = this.i18n.text(event.title);
    const { ui } = this.i18n;
    this.toast(event.type === 'questStarted' ? ui.questStarted(title) : ui.questCompleted(title));
  }

  private render(): void {
    const { session, i18n } = this;
    const { ui } = i18n;
    this.languageButton.setText(ui.switchLanguage);
    this.hint?.setText(this.touch ? ui.moveHintTouch : ui.moveHintKeyboard);
    this.actionButton?.setLabel(ui.talkButton);

    const nearby = session.inConversation ? null : session.nearbyNpc;
    this.prompt.setVisible(!!nearby && !this.touch);
    if (nearby) this.prompt.setText(ui.talkPrompt(i18n.text(nearby.name)));
    this.actionButton?.setVisible(!!nearby);

    const quests = session.trackedQuests;
    this.tracker.setVisible(quests.length > 0);
    this.tracker.setText(
      quests.map((q) => `${i18n.text(q.title)}\n• ${i18n.text(q.step)}`).join('\n\n'),
    );

    this.dialogue.render(session.conversation);
    this.layout();
  }

  private layout(): void {
    const { width, height } = this.scale;
    const below = this.languageButton.y + this.languageButton.height + 8;
    this.hint?.setPosition(MARGIN, below).setWordWrapWidth(width * 0.55);
    this.prompt.setPosition(width / 2, height - MARGIN * 2);
    this.tracker.setPosition(width - MARGIN, MARGIN);
    const languageRight = this.languageButton.x + this.languageButton.width;
    this.tracker.setWordWrapWidth(Math.min(320, width - languageRight - MARGIN * 2));

    this.actionButton?.placeBottomRight(width, height);
    this.dialogue.layout();
  }

  private showHint(): void {
    const hint = setSmartWrap(
      this.add.text(MARGIN, MARGIN, '', LABEL_STYLE),
      300,
      () => this.i18n.locale,
    );
    this.hint = hint;
    this.time.delayedCall(6000, () => {
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 800,
        onComplete: () => {
          hint.destroy();
          this.hint = null;
        },
      });
    });
  }

  private toast(message: string): void {
    const text = setSmartWrap(
      this.add
        .text(this.scale.width / 2, this.scale.height * 0.25, message, {
          ...LABEL_STYLE,
          fontSize: '22px',
          color: '#ffd479',
          align: 'center',
        })
        .setOrigin(0.5),
      this.scale.width - MARGIN * 2,
      () => this.i18n.locale,
    );
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 2500,
      duration: 700,
      onComplete: () => text.destroy(),
    });
  }
}
