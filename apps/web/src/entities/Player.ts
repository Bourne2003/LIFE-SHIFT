import type Phaser from 'phaser';
import {
  PLAYER_SPEED,
  facingFromIntent,
  intentToVelocity,
  type Facing,
  type MoveIntent,
  type Vec2,
} from '@life-shift/shared';
import { TextureKeys } from '../game/assets';

export type PlayerState = 'idle' | 'walk';

/**
 * The local player. Owns its physics body and derives animation state from the intent it is
 * given; it does not read input devices itself (see InputManager).
 */
export class Player {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private _facing: Facing = 'down';
  private _state: PlayerState = 'idle';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, TextureKeys.Player);
    this.sprite.setCollideWorldBounds(true);
    // Collide with feet, not the whole sprite, so the player can overlap things "behind" them.
    this.sprite.body.setSize(this.sprite.width * 0.6, this.sprite.height * 0.4);
    this.sprite.body.setOffset(this.sprite.width * 0.2, this.sprite.height * 0.6);
  }

  get facing(): Facing {
    return this._facing;
  }

  get state(): PlayerState {
    return this._state;
  }

  /** Where the player's feet are: used for interaction range and location checks. */
  get position(): Vec2 {
    return this.sprite.body.center;
  }

  /** Moves the player so their feet are at `feet` (spawning, loading, debug). */
  placeFeetAt(feet: Vec2): void {
    const b = this.sprite.body;
    this.sprite.body.reset(
      feet.x - b.offset.x - b.halfWidth + this.sprite.displayOriginX,
      feet.y - b.offset.y - b.halfHeight + this.sprite.displayOriginY,
    );
    this.sprite.setDepth(this.sprite.y);
  }

  applyIntent(intent: MoveIntent): void {
    const v = intentToVelocity(intent, PLAYER_SPEED);
    this.sprite.setVelocity(v.x, v.y);
    this._facing = facingFromIntent(intent, this._facing);
    this._state = v.x === 0 && v.y === 0 ? 'idle' : 'walk';
    // Placeholder facing cue until real directional animations exist.
    if (this._facing === 'left') this.sprite.setFlipX(true);
    else if (this._facing === 'right') this.sprite.setFlipX(false);
    // Keep nearer (lower) objects drawn on top.
    this.sprite.setDepth(this.sprite.y);
  }
}
