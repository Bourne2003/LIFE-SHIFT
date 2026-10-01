import type Phaser from 'phaser';
import { tileCenter, type Interactable, type Vec2, type WorldObjectDef } from '@life-shift/shared';

/** A sign, notice board or similar: inspectable, blocks movement, looks like the world state. */
export class WorldObject implements Interactable {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;

  constructor(
    scene: Phaser.Scene,
    readonly def: WorldObjectDef,
    texture: string,
  ) {
    const { x, y } = tileCenter(def.position);
    this.sprite = scene.physics.add.staticSprite(x, y, texture);
    // Only the post/base blocks movement, so the player can stand right in front of it.
    this.sprite.body.setSize(this.sprite.width * 0.5, this.sprite.height * 0.3);
    this.sprite.body.setOffset(this.sprite.width * 0.25, this.sprite.height * 0.7);
    this.sprite.setDepth(y);
  }

  get id(): string {
    return this.def.id;
  }

  get position(): Vec2 {
    return this.sprite.body.center;
  }

  setTexture(texture: string): void {
    if (this.sprite.texture.key !== texture) this.sprite.setTexture(texture);
  }
}
