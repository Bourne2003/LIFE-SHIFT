import Phaser from 'phaser';
import { CONTENT } from '@life-shift/game-data';
import { config } from '../config';
import { SceneKeys } from '../game/sceneKeys';
import { getServices } from '../game/services';
import type { GameSession, SessionEvent } from '../game/session';
import { formatClock, type LocalizedText } from '@life-shift/shared';
import type { LocaleService } from '../i18n/LocaleService';
import { TouchActionButton } from '../input/TouchActionButton';
import { TouchJoystick } from '../input/TouchJoystick';
import { DialogueBox } from '../ui/DialogueBox';
import { ListPanel, PANEL_DEPTH } from '../ui/ListPanel';
import { RainEffect } from '../ui/RainEffect';
import { TEXT_STYLE, setSmartWrap } from '../ui/style';

const MARGIN = 16;
const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  ...TEXT_STYLE,
  backgroundColor: '#00000080',
  padding: { x: 10, y: 6 },
};

/**
 * Screen-space overlay drawn above the world with an unzoomed camera: touch controls, the
 * language switch, the interaction prompt, the dialogue box, money, quest tracker, and the shop
 * and bag panels. It renders the
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
  private money!: Phaser.GameObjects.Text;
  private clock!: Phaser.GameObjects.Text;
  private rain!: RainEffect;
  private bagButton!: Phaser.GameObjects.Text;
  private shopPanel!: ListPanel;
  private bagPanel!: ListPanel;
  private menuButton!: Phaser.GameObjects.Text;
  private pausePanel!: ListPanel;
  private confirmingNewGame = false;
  private toasts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SceneKeys.UI);
  }

  /** On-screen interact button (touch devices only), for tests. */
  get interactButton(): TouchActionButton | null {
    return this.actionButton;
  }

  /** Screen positions of UI controls, for tests. */
  get controls() {
    const centre = (t: Phaser.GameObjects.Text) => {
      const b = t.getBounds();
      return { x: b.centerX, y: b.centerY };
    };
    return {
      bagButton: centre(this.bagButton),
      menuButton: centre(this.menuButton),
      pause: this.pausePanel.isVisible ? this.pausePanel.hitPoints : null,
      dialogueChoices: this.dialogue.choiceBounds.map((b) => ({
        x: b.x + b.width / 2,
        y: b.y + b.height / 2,
      })),
      shop: this.shopPanel.isVisible ? this.shopPanel.hitPoints : null,
      bag: this.bagPanel.isVisible ? this.bagPanel.hitPoints : null,
    };
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
    // Weather sits under every HUD element.
    this.rain = new RainEffect(this, -1);

    cleanups.push(input.add(new TouchJoystick(this)));
    if (this.touch) {
      this.actionButton = new TouchActionButton(this);
      cleanups.push(input.add(this.actionButton));
    }

    this.languageButton = this.add
      .text(MARGIN, MARGIN, '', { ...LABEL_STYLE, fontStyle: 'bold' })
      .setInteractive({ useHandCursor: true });
    this.languageButton.on('pointerdown', () => i18n.cycle());
    this.bagButton = this.add
      .text(0, MARGIN, '', { ...LABEL_STYLE, fontStyle: 'bold' })
      .setInteractive({ useHandCursor: true });
    this.bagButton.on('pointerdown', () => session.toggleInventory());
    this.menuButton = this.add
      .text(0, MARGIN, '', { ...LABEL_STYLE, fontStyle: 'bold' })
      .setInteractive({ useHandCursor: true });
    this.menuButton.on('pointerdown', () => session.setPaused(!session.paused));
    this.money = this.add
      .text(0, MARGIN, '', { ...LABEL_STYLE, fontStyle: 'bold' })
      .setOrigin(1, 0);
    this.clock = this.add.text(0, 0, '', LABEL_STYLE).setOrigin(1, 0);

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
    this.shopPanel = new ListPanel(
      this,
      () => i18n.locale,
      // Tapping only selects; buying is always an explicit Buy press, so nobody buys by accident.
      (i) => session.selectShopEntry(i),
    );
    this.bagPanel = new ListPanel(
      this,
      () => i18n.locale,
      () => {},
    );
    this.pausePanel = new ListPanel(
      this,
      () => i18n.locale,
      () => {},
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
    if (event.type === 'clockTick') return this.renderClock();
    if (event.type === 'stateChanged') return;
    const { ui } = this.i18n;
    const t = (text: LocalizedText) => this.i18n.text(text);
    switch (event.type) {
      case 'questStarted':
        return this.toast(ui.questStarted(t(event.title)));
      case 'questCompleted':
        return this.toast(ui.questCompleted(t(event.title)));
      case 'purchased':
        return this.toast(ui.bought(t(event.item), event.price));
      case 'sold':
        return this.toast(ui.sold(t(event.item), event.price));
      case 'cannotAfford':
        return this.toast(ui.cannotAfford(t(event.item)), '#ff8a80');
      case 'locationEntered':
        return event.discovered
          ? this.toast(ui.secretFound(t(event.name)), '#c9a7ff')
          : this.toast(`— ${t(event.name)} —`, '#ffffff');
      case 'moneyReceived':
        return this.toast(ui.moneyReceived(event.amount));
    }
  }

  private render(): void {
    const { session, i18n } = this;
    const { ui } = i18n;
    this.languageButton.setText(ui.switchLanguage);
    this.hint?.setText(this.touch ? ui.moveHintTouch : ui.moveHintKeyboard);
    this.actionButton?.setLabel(ui.talkButton);

    const busy = session.inConversation || session.inShop || session.paused;
    const nearby = busy ? null : session.nearbyNpc;
    this.prompt.setVisible(!!nearby && !this.touch);
    if (nearby) this.prompt.setText(ui.talkPrompt(i18n.text(nearby.name)));
    this.actionButton?.setVisible(!!nearby);

    const quests = session.trackedQuests;
    this.tracker.setVisible(quests.length > 0);
    this.tracker.setText(
      quests.map((q) => `${i18n.text(q.title)}\n• ${i18n.text(q.step)}`).join('\n\n'),
    );

    this.dialogue.render(session.conversation);
    this.money.setText(ui.money(session.state.money));
    this.renderClock(false);
    this.bagButton.setText(ui.bagButton);
    this.menuButton.setText(ui.menuButton);
    this.renderShop();
    this.renderBag();
    this.renderPause();
    this.layout();
  }

  /** Day, time and weather under the money; also starts or stops the rain. */
  private renderClock(relayout = true): void {
    const { ui } = this.i18n;
    const env = this.session.environment;
    const weather = env.weather === 'rain' ? ui.weatherRain : ui.weatherClear;
    this.clock.setText(`${ui.clock(env.day, formatClock(env.minute))} · ${weather}`);
    this.rain.setActive(env.weather === 'rain');
    if (relayout) this.layout();
  }

  /** Whether rain is being drawn (tests). */
  get raining(): boolean {
    return this.rain.isRaining;
  }

  override update(_time: number, deltaMs: number): void {
    this.rain.update(deltaMs);
  }

  private renderShop(): void {
    const { session, i18n } = this;
    const { ui } = i18n;
    const shop = session.shopView;
    if (!shop) return this.shopPanel.render(null);
    const selected = shop.entries[shop.selected];
    const selling = shop.mode === 'sell';
    this.shopPanel.render({
      title: `${i18n.text(shop.name)} · ${selling ? ui.toSellMode : ui.toBuyMode}`,
      titleDetail: ui.money(shop.money),
      rows: shop.entries.map((e) => ({
        label: e.owned ? `${i18n.text(e.name)}  (${ui.owned(e.owned)})` : i18n.text(e.name),
        detail: (selling ? '+' : '') + ui.money(e.price),
        dim: !e.affordable,
      })),
      selected: shop.selected,
      emptyText: ui.sellEmpty,
      ...(selected ? { note: i18n.text(selected.description) } : {}),
      hint: this.touch ? ui.shopHintTouch : ui.shopHintKeyboard,
      buttons: [
        {
          label: selling ? ui.sellButton : ui.buyButton,
          onPress: () => session.confirmShopEntry(),
        },
        {
          label: selling ? ui.toBuyMode : ui.toSellMode,
          onPress: () => session.setShopMode(selling ? 'buy' : 'sell'),
        },
        { label: ui.closeButton, onPress: () => session.closeShop() },
      ],
    });
  }

  /** Pause menu: resume, or start a new game after an explicit confirmation. */
  private renderPause(): void {
    const { session, i18n } = this;
    const { ui } = i18n;
    if (!session.paused) {
      this.confirmingNewGame = false;
      return this.pausePanel.render(null);
    }
    if (this.confirmingNewGame) {
      return this.pausePanel.render({
        title: ui.newGameButton,
        rows: [],
        selected: null,
        emptyText: '',
        note: ui.newGameWarning,
        buttons: [
          { label: ui.confirmNewGame, onPress: () => this.startNewGame() },
          {
            label: ui.cancelButton,
            onPress: () => {
              this.confirmingNewGame = false;
              this.render();
            },
          },
        ],
      });
    }
    const { day } = session.environment;
    const done = Object.values(session.quests).filter((q) => q.status === 'completed').length;
    this.pausePanel.render({
      title: ui.pausedTitle,
      titleDetail: `v${config.version}`,
      rows: [],
      selected: null,
      emptyText: '',
      note: ui.pausedSummary(
        day,
        ui.money(session.state.money),
        done,
        Object.keys(CONTENT.quests).length,
      ),
      ...(this.touch ? {} : { hint: ui.pauseHintKeyboard }),
      buttons: [
        { label: ui.resumeButton, onPress: () => session.setPaused(false) },
        {
          label: ui.newGameButton,
          onPress: () => {
            this.confirmingNewGame = true;
            this.render();
          },
        },
      ],
    });
  }

  /** Erases the save and restarts from a clean page, so no old state can linger in memory. */
  private startNewGame(): void {
    const { save } = getServices(this);
    save.disable(); // stop the page-hide autosave from writing the old game back
    save.clear();
    window.location.reload();
  }

  private renderBag(): void {
    const { session, i18n } = this;
    const { ui } = i18n;
    if (!session.inventoryOpen) return this.bagPanel.render(null);
    const items = session.inventory;
    this.bagPanel.render({
      title: ui.bagTitle,
      titleDetail: ui.money(session.state.money),
      rows: items.map((e) => ({ label: i18n.text(e.name), detail: `×${e.count}` })),
      selected: null,
      emptyText: ui.bagEmpty,
      ...(items.length
        ? { note: items.map((e) => `• ${i18n.text(e.description)}`).join('\n') }
        : {}),
      ...(this.touch ? {} : { hint: ui.bagHintKeyboard }),
      buttons: [{ label: ui.closeButton, onPress: () => session.toggleInventory(false) }],
    });
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.bagButton.setPosition(this.languageButton.x + this.languageButton.width + 8, MARGIN);
    this.menuButton.setPosition(this.bagButton.x + this.bagButton.width + 8, MARGIN);
    this.prompt.setPosition(width / 2, height - MARGIN * 2);
    this.money.setPosition(width - MARGIN, MARGIN);
    this.clock.setPosition(width - MARGIN, MARGIN + this.money.height + 8);
    let trackerTop = this.clock.y + this.clock.height + 8;

    // The start-up hint sits under the buttons, beside the clock when there is room; on narrow
    // screens it goes below the clock instead, and the quest tracker below the hint.
    if (this.hint) {
      const below = this.languageButton.y + this.languageButton.height + 8;
      const besideClock = width - MARGIN - this.clock.width - MARGIN * 3;
      if (besideClock >= 240) {
        this.hint.setPosition(MARGIN, below).setWordWrapWidth(Math.min(width * 0.55, besideClock));
      } else {
        // Minus the label's horizontal padding (10 px each side).
        this.hint.setPosition(MARGIN, trackerTop).setWordWrapWidth(width - MARGIN * 2 - 20);
        trackerTop = this.hint.y + this.hint.height + 8;
      }
    }
    this.tracker.setPosition(width - MARGIN, trackerTop);
    const languageRight = this.menuButton.x + this.menuButton.width;
    this.tracker.setWordWrapWidth(Math.min(320, width - languageRight - MARGIN * 2));

    this.actionButton?.placeBottomRight(width, height);
    this.dialogue.layout();
    this.shopPanel.layout();
    this.bagPanel.layout();
    this.pausePanel.layout();
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
          this.layout();
        },
      });
    });
  }

  /** Short message in the upper middle of the screen; several stack instead of overlapping. */
  private toast(message: string, color = '#ffd479'): void {
    const last = this.toasts.at(-1);
    const y = last ? last.y + last.height + 8 : this.scale.height * 0.25;
    const text = setSmartWrap(
      this.add
        .text(this.scale.width / 2, y, message, {
          ...LABEL_STYLE,
          fontSize: '22px',
          color,
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setDepth(PANEL_DEPTH + 1),
      this.scale.width - MARGIN * 2,
      () => this.i18n.locale,
    );
    this.toasts.push(text);
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 2500,
      duration: 700,
      onComplete: () => {
        this.toasts = this.toasts.filter((t) => t !== text);
        text.destroy();
      },
    });
  }
}
