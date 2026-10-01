import Phaser from 'phaser';
import {
  IDLE_INTENT,
  findNearestInRange,
  locationsAt,
  tileCenter,
  worldToTile,
  type TilePos,
} from '@life-shift/shared';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { SceneKeys } from '../game/sceneKeys';
import { getServices, type GameServices } from '../game/services';
import { zoomForViewport } from '../game/viewport';
import { KeyboardInputSource } from '../input/KeyboardInputSource';
import { buildTownMap } from '../world/TownMap';

/** The explorable town: map, collision, NPCs, interaction and location tracking. */
export class WorldScene extends Phaser.Scene {
  private services!: GameServices;
  private _player!: Player;
  private _npcs: Npc[] = [];
  private target: Npc | undefined;
  private tile: TilePos = { x: -1, y: -1 };
  private area: string | undefined;

  constructor() {
    super(SceneKeys.World);
  }

  get player(): Player {
    return this._player;
  }

  get npcs(): readonly Npc[] {
    return this._npcs;
  }

  get interactTarget(): Npc | undefined {
    return this.target;
  }

  create(): void {
    this.services = getServices(this);
    const { content, input, session } = this.services;

    const map = buildTownMap(this, content.map);
    this.physics.world.setBounds(0, 0, map.widthPx, map.heightPx);

    const spawn = tileCenter(content.map.spawn);
    this._player = new Player(this, spawn.x, spawn.y);
    this._player.placeFeetAt(spawn);
    this._npcs = content.npcs.map((def) => new Npc(this, def));
    this.target = undefined;
    this.tile = { x: -1, y: -1 };
    this.area = undefined;

    this.physics.add.collider(this._player.sprite, map.layer);
    this.physics.add.collider(
      this._player.sprite,
      this._npcs.map((n) => n.sprite),
    );

    const cleanups: (() => void)[] = [];
    if (this.input.keyboard) {
      const keyboard = new KeyboardInputSource(this.input.keyboard, (a) => input.press(a));
      cleanups.push(input.add(keyboard));
    }
    // A quest can start (or advance) while the player is already standing in its target area.
    cleanups.push(session.on('notice', () => this.reportLocations()));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cleanups.forEach((c) => c()));

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthPx, map.heightPx);
    cam.startFollow(this._player.sprite, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    this.fitCamera(this.scale.gameSize);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });
  }

  override update(): void {
    const { input, dialogue } = this.services;
    const interact = input.consume('interact');

    if (dialogue.active) {
      this._player.applyIntent(IDLE_INTENT);
      if (input.consume('cancel')) dialogue.close();
      else if (interact) dialogue.advance();
    } else {
      this._player.applyIntent(input.getMoveIntent());
      this.updateTarget();
      if (interact && this.target) {
        this.target.face(this._player.position);
        dialogue.start(this.target.def);
      }
    }

    this.trackLocation();
    input.endFrame();
  }

  /** Moves the player to a tile (used by the debug API; later by save/load). */
  teleport(tile: TilePos): void {
    this._player.placeFeetAt(tileCenter(tile));
    this.cameras.main.centerOn(this._player.sprite.x, this._player.sprite.y);
  }

  private updateTarget(): void {
    const next = findNearestInRange(this._player.position, this._npcs);
    if (next === this.target) return;
    this.target = next;
    this.services.world.emit('interactTarget', next ? { id: next.id, name: next.def.name } : null);
  }

  private trackLocation(): void {
    const tile = worldToTile(this._player.position);
    if (tile.x === this.tile.x && tile.y === this.tile.y) return;
    this.tile = tile;

    const here = locationsAt(this.services.content.map.locations, tile);
    const mostSpecific = here[0];
    if (mostSpecific && mostSpecific.id !== this.area) {
      this.services.world.emit('areaEntered', mostSpecific);
    }
    this.area = mostSpecific?.id;
    this.reportLocations();
  }

  private reportLocations(): void {
    const { content, session } = this.services;
    for (const location of locationsAt(content.map.locations, this.tile)) {
      session.questEvent({ type: 'reach', location: location.id });
    }
  }

  private fitCamera(size: Phaser.Structs.Size): void {
    const bounds = this.physics.world.bounds;
    this.cameras.main.setZoom(
      zoomForViewport(size.width, size.height, bounds.width, bounds.height),
    );
  }
}
