import Phaser from 'phaser';
import {
  IDLE_INTENT,
  findNearestInRange,
  locationsAt,
  npcPosition,
  objectTexture,
  tileCenter,
  worldToTile,
  type TilePos,
  type Vec2,
} from '@life-shift/shared';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { WorldObject } from '../entities/WorldObject';
import { talkerFromNpc, talkerFromObject, type Talker } from '../game/DialogueController';
import { SceneKeys } from '../game/sceneKeys';
import { getServices, type GameServices } from '../game/services';
import { zoomForViewport } from '../game/viewport';
import { KeyboardInputSource } from '../input/KeyboardInputSource';
import { buildTownMap } from '../world/TownMap';

/** Something in the world the player can walk up to and interact with. */
interface InteractableEntity {
  readonly id: string;
  readonly position: Vec2;
  readonly talker: Talker;
  face?(point: Vec2): void;
}

/**
 * The explorable town: map, collision, NPCs and objects that follow world state, interaction,
 * and location tracking.
 */
export class WorldScene extends Phaser.Scene {
  private services!: GameServices;
  private _player!: Player;
  private _npcs: Npc[] = [];
  private _objects: WorldObject[] = [];
  private interactables: InteractableEntity[] = [];
  private target: InteractableEntity | undefined;
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

  get objects(): readonly WorldObject[] {
    return this._objects;
  }

  get interactTarget(): string | undefined {
    return this.target?.id;
  }

  create(): void {
    this.services = getServices(this);
    const { content, input, session, save } = this.services;
    const state = session.state;

    const map = buildTownMap(this, content.map);
    this.physics.world.setBounds(0, 0, map.widthPx, map.heightPx);

    const start = tileCenter(save.startTile);
    this._player = new Player(this, start.x, start.y);
    this._player.placeFeetAt(start);
    this._npcs = content.npcs.map((def) => new Npc(this, def, npcPosition(def, state, content)));
    this._objects = content.objects.map(
      (def) => new WorldObject(this, def, objectTexture(def, state, content)!),
    );
    this.interactables = [
      ...this._npcs.map((npc) => ({
        id: npc.id,
        get position() {
          return npc.position;
        },
        talker: talkerFromNpc(npc.def),
        face: (p: Vec2) => npc.face(p),
      })),
      ...this._objects.map((object) => ({
        id: object.id,
        get position() {
          return object.position;
        },
        talker: talkerFromObject(object.def),
      })),
    ];
    this.target = undefined;
    this.tile = { x: -1, y: -1 };
    this.area = undefined;

    this.physics.add.collider(this._player.sprite, map.layer);
    this.physics.add.collider(this._player.sprite, [
      ...this._npcs.map((n) => n.sprite),
      ...this._objects.map((o) => o.sprite),
    ]);

    const cleanups: (() => void)[] = [];
    if (this.input.keyboard) {
      const keyboard = new KeyboardInputSource(this.input.keyboard, (a) => input.press(a));
      cleanups.push(input.add(keyboard));
    }
    // World state drives where people stand and how objects look.
    cleanups.push(session.on('state', () => this.syncWithState(true)));
    // A quest can start (or advance) while the player is already standing in its target area.
    cleanups.push(session.on('notice', () => this.reportLocations()));
    cleanups.push(
      save.attachPlayer({
        getTile: () => worldToTile(this._player.position),
        teleport: (tile) => this.teleport(tile),
      }),
    );
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
    const { input, dialogue, ui } = this.services;
    const interact = input.consume('interact');

    if (ui.menuOpen) {
      this._player.applyIntent(IDLE_INTENT);
    } else if (dialogue.active) {
      this._player.applyIntent(IDLE_INTENT);
      if (input.consume('cancel')) dialogue.close();
      else if (interact) dialogue.advance();
    } else {
      this._player.applyIntent(input.getMoveIntent());
      this.updateTarget();
      if (interact && this.target) {
        this.target.face?.(this._player.position);
        dialogue.start(this.target.talker);
      }
    }

    this.trackLocation();
    input.endFrame();
  }

  /** Moves the player to a tile (save/load, new game, debug). */
  teleport(tile: TilePos): void {
    this._player.placeFeetAt(tileCenter(tile));
    this.cameras.main.centerOn(this._player.sprite.x, this._player.sprite.y);
  }

  private syncWithState(animate: boolean): void {
    const { session, content } = this.services;
    for (const npc of this._npcs) npc.moveTo(npcPosition(npc.def, session.state, content), animate);
    for (const object of this._objects) {
      object.setTexture(objectTexture(object.def, session.state, content)!);
    }
  }

  private updateTarget(): void {
    const next = findNearestInRange(this._player.position, this.interactables);
    if (next === this.target) return;
    this.target = next;
    this.services.world.emit(
      'interactTarget',
      next ? { id: next.id, name: next.talker.name, kind: next.talker.kind } : null,
    );
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
      session.handleEvent({ type: 'reach', location: location.id });
    }
  }

  private fitCamera(size: Phaser.Structs.Size): void {
    const bounds = this.physics.world.bounds;
    this.cameras.main.setZoom(
      zoomForViewport(size.width, size.height, bounds.width, bounds.height),
    );
  }
}
