import type Phaser from 'phaser';
import { tileCenter, type Interactable, type NpcDef, type Vec2 } from '@life-shift/shared';
import { CHARACTER_SIZE } from '../art/placeholderArt';
import { TextureKeys } from '../game/assets';

/** A townsperson standing at their default position. Behaviour comes from their NpcDef. */
export class Npc implements Interactable {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;

  constructor(
    scene: Phaser.Scene,
    readonly def: NpcDef,
  ) {
    const { x, y } = tileCenter(def.position);
    this.sprite = scene.physics.add.staticSprite(x, y, TextureKeys.npc(def.id));
    // Same feet-only body as the player, so characters can stand close without overlapping.
    const { width: w, height: h } = CHARACTER_SIZE;
    this.sprite.body.setSize(w * 0.6, h * 0.4);
    this.sprite.body.setOffset(w * 0.2, h * 0.6);
    this.sprite.setDepth(y);
  }

  get id(): string {
    return this.def.id;
  }

  /** Where the NPC's feet are, for interaction range checks. */
  get position(): Vec2 {
    return this.sprite.body.center;
  }

  /** Turns to look at a point (placeholder art only supports left/right). */
  face(point: Vec2): void {
    this.sprite.setFlipX(point.x < this.sprite.x);
  }
}
