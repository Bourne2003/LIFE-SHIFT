import Phaser from 'phaser';
import { LOCATIONS, NPCS, PROPS } from '@life-shift/game-data';
import {
  IDLE_INTENT,
  TILE_SIZE,
  WORLD_OBSTACLES,
  findInteractionTarget,
  locationAt,
  tileFeet,
  type LocalizedText,
  type LocationDef,
  type WorldPropDef,
} from '@life-shift/shared';
import { Player } from '../entities/Player';
import { TextureKeys } from '../game/assets';
import { SceneKeys } from '../game/sceneKeys';
import { startAutosave } from '../game/autosave';
import { getServices, type GameServices } from '../game/services';
import { zoomForViewport } from '../game/viewport';
import { KeyboardInputSource } from '../input/KeyboardInputSource';

export const WORLD_TILES_WIDE = 40;
export const WORLD_TILES_HIGH = 30;

/** NPC collision box at the feet, in world units. */
const NPC_FEET_W = 14;
const NPC_FEET_H = 10;

/** Art for each kind of world prop. */
const PROP_TEXTURES: Record<WorldPropDef['kind'], string> = {
  'noodle-stall': TextureKeys.NoodleStall,
  lantern: TextureKeys.Lantern,
  'clock-face': TextureKeys.ClockFace,
};

const GROUND_TEXTURES: Record<NonNullable<LocationDef['ground']>, string> = {
  park: TextureKeys.ParkGround,
  market: TextureKeys.MarketGround,
  alley: TextureKeys.AlleyGround,
};

/** Props that light up the night. */
const GLOWING: ReadonlySet<WorldPropDef['kind']> = new Set(['lantern']);
/** Everything in the world is drawn below this; the night overlay and lights go above. */
const NIGHT_DEPTH = 100_000;

/**
 * The explorable world: roads, obstacles, NPCs the player can talk to, and props that appear or
 * disappear as the story changes the world.
 */
export class WorldScene extends Phaser.Scene {
  private services!: GameServices;
  private _player!: Player;
  private propSprites = new Map<string, Phaser.GameObjects.Image>();
  private glows = new Map<string, Phaser.GameObjects.Image>();
  private night!: Phaser.GameObjects.Rectangle;
  private npcSprites: {
    id: string;
    name: LocalizedText;
    sprite: Phaser.GameObjects.Image;
    blocker: Phaser.GameObjects.Zone;
  }[] = [];

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
    // Named places with their own ground (park lawn, market paving, alley cobbles), under roads.
    for (const loc of LOCATIONS) {
      if (!loc.ground) continue;
      this.add
        .tileSprite(
          loc.xTiles * TILE_SIZE,
          loc.yTiles * TILE_SIZE,
          loc.widthTiles * TILE_SIZE,
          loc.heightTiles * TILE_SIZE,
          GROUND_TEXTURES[loc.ground],
        )
        .setOrigin(0);
    }
    // Placeholder central street, to give the camera movement a visual reference.
    this.add
      .tileSprite(0, worldH / 2 - TILE_SIZE, worldW, TILE_SIZE * 2, TextureKeys.Road)
      .setOrigin(0);
    this.add
      .tileSprite(worldW / 2 - TILE_SIZE, 0, TILE_SIZE * 2, worldH, TextureKeys.Road)
      .setOrigin(0);

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this._player = new Player(this, worldW / 2, worldH / 2);
    const saved = this.services.save.loaded?.player;
    if (saved) {
      // Keep the saved spot inside the world in case the map shrank since the save was made.
      const clamp = (v: number, max: number) => Math.min(Math.max(v, TILE_SIZE), max - TILE_SIZE);
      this._player.placeFeetAt(clamp(saved.x, worldW), clamp(saved.y, worldH));
    }

    for (const prop of PROPS) {
      const x = (prop.xTiles + prop.widthTiles / 2) * TILE_SIZE;
      const bottom = (prop.yTiles + prop.heightTiles) * TILE_SIZE;
      const sprite = this.add
        .image(x, bottom, PROP_TEXTURES[prop.kind])
        .setOrigin(0.5, 1)
        .setDisplaySize(prop.widthTiles * TILE_SIZE, prop.heightTiles * TILE_SIZE)
        .setDepth(bottom);
      this.propSprites.set(prop.id, sprite);
      if (GLOWING.has(prop.kind)) {
        const glow = this.add
          .image(x, bottom - prop.heightTiles * TILE_SIZE * 0.75, TextureKeys.LightGlow)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(NIGHT_DEPTH + 1);
        this.glows.set(prop.id, glow);
      }
    }
    // Darkens the whole world at night; lights (glows) are drawn above it.
    this.night = this.add
      .rectangle(0, 0, worldW, worldH, 0x0a1030, 1)
      .setOrigin(0)
      .setDepth(NIGHT_DEPTH);
    this.refreshProps();
    this.refreshLighting();
    const obstacleBodies = this.physics.add.staticGroup();
    this.npcSprites = NPCS.map((npc) => {
      const feet = tileFeet(npc.xTiles, npc.yTiles);
      const texture = npc.look === 'cat' ? TextureKeys.Cat : TextureKeys.Npc;
      const sprite = this.add.image(feet.x, feet.y, texture).setOrigin(0.5, 1);
      sprite.setDepth(sprite.y);
      // NPCs block the player at their feet only, like the player's own body.
      const blocker = this.add.zone(feet.x, feet.y - NPC_FEET_H / 2, NPC_FEET_W, NPC_FEET_H);
      obstacleBodies.add(blocker);
      return { id: npc.id, name: npc.name, sprite, blocker };
    });
    this.refreshNpcs();
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
    cam.centerOn(this._player.sprite.x, this._player.sprite.y);
    cam.setRoundPixels(true);
    this.fitCamera(this.scale.gameSize);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    const { session, save } = this.services;
    const offSession = session.on((e) => {
      if (e.type === 'stateChanged') {
        this.refreshProps();
        this.refreshNpcs();
      }
      if (e.type === 'clockTick') this.refreshLighting();
    });
    const stopAutosave = startAutosave(session, save, () => this._player.feet);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
      offSession();
      stopAutosave();
    });
  }

  /** Ids of the props currently shown. */
  get visibleProps(): string[] {
    return [...this.propSprites].filter(([, s]) => s.visible).map(([id]) => id);
  }

  private refreshProps(): void {
    const visible = new Set(this.services.session.visibleProps.map((p) => p.id));
    for (const [id, sprite] of this.propSprites) sprite.setVisible(visible.has(id));
    for (const [id, glow] of this.glows) glow.setVisible(visible.has(id));
  }

  /** Night overlay strength and lantern glow follow the clock. */
  private refreshLighting(): void {
    const { darkness } = this.services.session.environment;
    this.night.setAlpha(darkness).setVisible(darkness > 0);
    for (const glow of this.glows.values()) glow.setAlpha(Math.min(1, darkness * 1.6));
  }

  /** Current night overlay opacity (tests). */
  get nightOpacity(): number {
    return this.night.visible ? this.night.alpha : 0;
  }

  override update(_time: number, deltaMs: number): void {
    const { input, session } = this.services;
    // Phaser already stops the loop while the tab is hidden; this only guards against a single
    // huge hitch. Keep it generous so slow devices (a few fps) still get real-time days.
    session.tick(Math.min(deltaMs, 1000) / 1000);
    const actions = input.consumeActions();

    // The pause menu is driven by its buttons; Esc resumes.
    if (session.paused) {
      this._player.applyIntent(IDLE_INTENT);
      if (actions.has('cancel')) session.setPaused(false);
      return;
    }

    if (actions.has('inventory') && !session.inShop) session.toggleInventory();

    if (session.inShop) {
      this._player.applyIntent(IDLE_INTENT);
      if (actions.has('navUp')) session.moveSelection(-1);
      if (actions.has('navDown')) session.moveSelection(1);
      if (actions.has('interact')) session.confirmShopEntry();
      if (actions.has('switchTab'))
        session.setShopMode(session.shopView?.mode === 'buy' ? 'sell' : 'buy');
      if (actions.has('cancel')) session.closeShop();
      return;
    }

    if (session.inConversation) {
      this._player.applyIntent(IDLE_INTENT);
      if (actions.has('navUp')) session.moveSelection(-1);
      if (actions.has('navDown')) session.moveSelection(1);
      if (actions.has('interact')) session.advance();
      return;
    }

    // Esc closes the bag if it is open, otherwise opens the pause menu.
    if (actions.has('cancel')) {
      if (session.inventoryOpen) session.toggleInventory(false);
      else return session.setPaused(true);
    }
    this._player.applyIntent(input.getMoveIntent());
    const feet = this._player.feet;
    session.setLocation(locationAt(feet, LOCATIONS)?.id ?? null);
    const target = findInteractionTarget(
      feet,
      this.npcs.filter((n) => n.present),
    );
    session.setNearbyNpc(target?.id ?? null);
    if (target && actions.has('interact')) session.talkTo(target.id);
  }

  get npcs(): readonly {
    id: string;
    name: LocalizedText;
    x: number;
    y: number;
    present: boolean;
  }[] {
    return this.npcSprites.map(({ id, name, sprite }) => ({
      id,
      name,
      x: sprite.x,
      y: sprite.y,
      present: sprite.visible,
    }));
  }

  /** Shows only NPCs who are around in the current story state; absent ones neither block nor talk. */
  private refreshNpcs(): void {
    const present = new Set(this.services.session.presentNpcs.map((n) => n.id));
    for (const { id, sprite, blocker } of this.npcSprites) {
      const here = present.has(id);
      sprite.setVisible(here);
      (blocker.body as Phaser.Physics.Arcade.StaticBody).enable = here;
    }
  }

  private fitCamera(size: Phaser.Structs.Size): void {
    const bounds = this.physics.world.bounds;
    this.cameras.main.setZoom(
      zoomForViewport(size.width, size.height, bounds.width, bounds.height),
    );
  }
}
