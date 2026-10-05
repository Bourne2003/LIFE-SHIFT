import Phaser from 'phaser';
import { SceneKeys } from '../game/sceneKeys';
import { getServices } from '../game/services';
import { TouchJoystick } from '../input/TouchJoystick';
import { createTranslator, getInitialLocale, readStoredLocale } from '../i18n';
import type { WorldScene } from './WorldScene';
import type { TranslationKey } from '../i18n';

/**
 * Screen-space overlay drawn above the world with an unzoomed camera. Hosts touch controls now,
 * and the HUD, dialogue and menus in later milestones.
 */
export class UIScene extends Phaser.Scene {
  private environmentText!: Phaser.GameObjects.Text;
  private translate!: (key: TranslationKey) => string;

  constructor() {
    super(SceneKeys.UI);
  }

  create(): void {
    const joystick = new TouchJoystick(this);
    const removeJoystick = getServices(this).input.add(joystick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeJoystick);

    const touch = this.sys.game.device.input.touch;
    const locale = getInitialLocale(
      window.location.search,
      import.meta.env.VITE_LOCALE,
      navigator.languages.length > 0 ? navigator.languages : [navigator.language],
      readStoredLocale(),
    );
    this.translate = createTranslator(locale);
    const story = this.add
      .text(16, 110, '', {
        fontFamily: 'system-ui, "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
        fontSize: '16px',
        color: '#fff8e7',
        backgroundColor: '#252a24dd',
        padding: { x: 10, y: 8 },
        wordWrap: { width: 360 },
      })
      .setScrollFactor(0)
      .setVisible(false);
    const objective = this.add
      .text(16, 180, this.translate('objective.explore'), {
        fontFamily: 'system-ui, "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
        fontSize: '15px',
        color: '#d8f3dc',
        backgroundColor: '#1c3324dd',
        padding: { x: 10, y: 6 },
        wordWrap: { width: 360 },
      })
      .setScrollFactor(0);
    this.environmentText = this.add
      .text(16, 235, '', {
        fontFamily: 'system-ui, "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
        fontSize: '14px',
        color: '#e8f1e2',
        backgroundColor: '#18231ddd',
        padding: { x: 8, y: 5 },
      })
      .setScrollFactor(0);
    const hint = this.add.text(
      16,
      16,
      touch ? this.translate('controls.touch') : this.translate('controls.keyboard'),
      {
        fontFamily: 'system-ui, "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 10, y: 6 },
      },
    );
    const handleInteract = () => getServices(this).input.requestInteract();
    window.addEventListener('life-shift-interact', handleInteract);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('life-shift-interact', handleInteract);
    });
    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 800, onComplete: () => hint.destroy() });
    });

    this.time.delayedCall(0, () => {
      const world = this.scene.get(SceneKeys.World) as WorldScene;
      world.setStoryUpdate((message, state) => {
        story.setText(message).setVisible(true);
        const objectiveKey: TranslationKey =
          state === 'find-landmark'
            ? 'objective.findLandmark'
            : state === 'find-park'
              ? 'objective.findPark'
              : state === 'complete-lanterns'
                ? 'objective.completeLanterns'
                : state === 'complete'
                  ? 'objective.complete'
                  : 'objective.explore';
        objective.setText(this.translate(objectiveKey));
        this.time.delayedCall(5000, () => story.setVisible(false));
      });
    });
  }

  override update(): void {
    if (!this.scene.isActive(SceneKeys.World)) return;
    const world = this.scene.get(SceneKeys.World) as WorldScene;
    const current = world.environment;
    const periodKey: TranslationKey = `world.${current.period}`;
    const weatherKey: TranslationKey = `world.${current.weather}`;
    this.environmentText.setText(`${this.translate(periodKey)} · ${this.translate(weatherKey)}`);
  }
}
