import Phaser from 'phaser';
import { SceneKeys } from '../game/sceneKeys';
import { getServices } from '../game/services';
import type { GameSession, SessionEvent } from '../game/session';
import { TouchActionButton } from '../input/TouchActionButton';
import { TouchJoystick } from '../input/TouchJoystick';
import { DialogueBox } from '../ui/DialogueBox';
import { TEXT_STYLE } from '../ui/style';

const MARGIN = 16;
const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  ...TEXT_STYLE,
  backgroundColor: '#00000080',
  padding: { x: 10, y: 6 },
};

/**
 * Screen-space overlay drawn above the world with an unzoomed camera: touch controls, the
 * interaction prompt, the dialogue box and the quest tracker. It renders the GameSession and
 * never changes the world directly.
 */
export class UIScene extends Phaser.Scene {
  private session!: GameSession;
  private touch = false;
  private actionButton: TouchActionButton | null = null;
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

  create(): void {
    const { input, session } = getServices(this);
    this.session = session;
    this.touch = this.sys.game.device.input.touch;
    const cleanups: (() => void)[] = [];

    cleanups.push(input.add(new TouchJoystick(this)));
    if (this.touch) {
      this.actionButton = new TouchActionButton(this);
      this.actionButton.setLabel('Talk');
      cleanups.push(input.add(this.actionButton));
    }

    this.prompt = this.add.text(0, 0, '', LABEL_STYLE).setOrigin(0.5, 1).setVisible(false);
    this.tracker = this.add.text(0, 0, '', LABEL_STYLE).setOrigin(1, 0).setVisible(false);
    this.dialogue = new DialogueBox(
      this,
      { onContinue: () => session.advance(), onChoose: (i) => session.choose(i) },
      this.touch ? 'Tap to continue' : 'E / Space to continue',
    );

    this.showHint();
    cleanups.push(session.on((event) => this.onSessionEvent(event)));
    this.render();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    cleanups.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cleanups.forEach((c) => c()));
  }

  private onSessionEvent(event: SessionEvent): void {
    if (event.type === 'changed') this.render();
    else if (event.type === 'questStarted') this.toast(`New quest: ${event.title}`);
    else this.toast(`Quest complete: ${event.title}`);
  }

  private render(): void {
    const { session } = this;
    const nearby = session.inConversation ? null : session.nearbyNpc;
    this.prompt.setVisible(!!nearby && !this.touch);
    if (nearby) this.prompt.setText(`E  Talk to ${nearby.name}`);
    this.actionButton?.setVisible(!!nearby);

    const quests = session.trackedQuests;
    this.tracker.setVisible(quests.length > 0);
    this.tracker.setText(quests.map((q) => `${q.title}\n• ${q.step}`).join('\n\n'));

    this.dialogue.render(session.conversation);
    this.layout();
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.prompt.setPosition(width / 2, height - MARGIN * 2);
    this.tracker.setPosition(width - MARGIN, MARGIN);
    this.actionButton?.placeBottomRight(width, height);
    this.dialogue.layout();
  }

  private showHint(): void {
    const hint = this.add
      .text(
        MARGIN,
        MARGIN,
        this.touch
          ? 'Drag on the left side to move · Tap Talk near people'
          : 'WASD / Arrow keys to move · E to talk',
        LABEL_STYLE,
      )
      .setWordWrapWidth(this.scale.width * 0.55);
    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 800, onComplete: () => hint.destroy() });
    });
  }

  private toast(message: string): void {
    const text = this.add
      .text(this.scale.width / 2, this.scale.height * 0.25, message, {
        ...LABEL_STYLE,
        fontSize: '22px',
        color: '#ffd479',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 2500,
      duration: 700,
      onComplete: () => text.destroy(),
    });
  }
}
