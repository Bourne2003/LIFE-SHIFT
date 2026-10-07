import Phaser from 'phaser';
import { TILE_SIZE, WORLD_OBSTACLES } from '@life-shift/shared';
import { Player } from '../entities/Player';
import { TextureKeys } from '../game/assets';
import { SceneKeys } from '../game/sceneKeys';
import { getServices, type GameServices } from '../game/services';
import { zoomForViewport } from '../game/viewport';
import { KeyboardInputSource } from '../input/KeyboardInputSource';

export const WORLD_TILES_WIDE = 40;
export const WORLD_TILES_HIGH = 30;

/** The explorable world. Milestone 1: open ground, a road and a controllable player. */
export class WorldScene extends Phaser.Scene {
  private services!: GameServices;
  private _player!: Player;

  constructor() {
    super(SceneKeys.World);
  }

  get player(): Player {
    return this._player;
  }

  create(): void {
    this.services = getServices(this);
    const worldW = WORLD_TILES_WIDE * TILE_SIZE;
    const worldH = WORLD_TILES_HIGH * TILE_SIZE;

    this.add.tileSprite(0, 0, worldW, worldH, TextureKeys.Ground).setOrigin(0);
    // Placeholder central street, to give the camera movement a visual reference.
    this.add
      .tileSprite(0, worldH / 2 - TILE_SIZE, worldW, TILE_SIZE * 2, TextureKeys.Road)
      .setOrigin(0);
    this.add
      .tileSprite(worldW / 2 - TILE_SIZE, 0, TILE_SIZE * 2, worldH, TextureKeys.Road)
      .setOrigin(0);

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this._player = new Player(this, worldW / 2, worldH / 2);
    const obstacleBodies = this.physics.add.staticGroup();
    for (const obstacle of WORLD_OBSTACLES) {
      const x = obstacle.xTiles * TILE_SIZE;
      const y = obstacle.yTiles * TILE_SIZE;
      const w = obstacle.widthTiles * TILE_SIZE;
      const h = obstacle.heightTiles * TILE_SIZE;
      const body = obstacleBodies
        .create(x + w / 2, y + h / 2, TextureKeys.Building)
        .setDisplaySize(w, h)
        .setOrigin(0.5);
      body.refreshBody();
    }
    this.physics.add.collider(this._player.sprite, obstacleBodies);

    if (this.input.keyboard) {
      const removeKeyboard = this.services.input.add(new KeyboardInputSource(this.input.keyboard));
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeKeyboard);
    }

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this._player.sprite, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    this.fitCamera(this.scale.gameSize);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });
  }

  override update(): void {
    this._player.applyIntent(this.services.input.getMoveIntent());
  }

  private fitCamera(size: Phaser.Structs.Size): void {
    const bounds = this.physics.world.bounds;
    this.cameras.main.setZoom(
      zoomForViewport(size.width, size.height, bounds.width, bounds.height),
    );
  }
}
