import Phaser from 'phaser';
import { TILE_SIZE } from '@life-shift/shared';
import { Player } from '../entities/Player';
import { TextureKeys } from '../game/assets';
import { SceneKeys } from '../game/sceneKeys';
import { getServices, type GameServices } from '../game/services';
import { zoomForViewport } from '../game/viewport';
import { KeyboardInputSource } from '../input/KeyboardInputSource';
import { KeyboardActionInputSource } from '../input/KeyboardActionInputSource';
import {
  CITY_LANDMARKS,
  CITY_NPCS,
  CITY_QUESTS,
  CITY_STRUCTURES,
  textForLocale,
} from '@life-shift/game-data';
import { getInitialLocale, readStoredLocale } from '../i18n';
import { environmentAt, type WorldEnvironment } from '../game/worldClock';
import {
  loadWorldMemory,
  saveWorldMemory,
  WORLD_MEMORY_VERSION,
  type MemoryStorage,
} from '../game/worldMemory';

export const WORLD_TILES_WIDE = 40;
export const WORLD_TILES_HIGH = 30;

/** The explorable city with data-driven content, collision and a controllable player. */
export class WorldScene extends Phaser.Scene {
  private services!: GameServices;
  private _player!: Player;
  private objective = 'explore';
  private readonly markers: Phaser.GameObjects.GameObject[] = [];
  private readonly landmarkSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly discoveredLandmarks = new Set<string>();
  private onStoryUpdate?: (message: string, objective: string) => void;
  private elapsedMs = 0;
  private memoryStorage: MemoryStorage | undefined;

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
    this.memoryStorage = this.getMemoryStorage();
    const memory = loadWorldMemory(this.memoryStorage);
    if (memory) {
      this.objective = memory.questState;
      for (const id of memory.discoveredLandmarks) this.discoveredLandmarks.add(id);
      this._player.sprite.setPosition(memory.player.x, memory.player.y);
    }
    this.createCityStructures();
    this.createCityContent();

    if (this.input.keyboard) {
      const removeKeyboard = this.services.input.add(new KeyboardInputSource(this.input.keyboard));
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeKeyboard);
      const removeActions = this.services.input.addActionSource(
        new KeyboardActionInputSource(this.input.keyboard),
      );
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeActions);
    }

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this._player.sprite, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    this.fitCamera(this.scale.gameSize);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
      window.removeEventListener('beforeunload', this.saveMemoryOnExit);
    });
    this.saveMemory();
    window.addEventListener('beforeunload', this.saveMemoryOnExit);
  }

  override update(): void {
    this.elapsedMs += this.game.loop.delta;
    this._player.applyIntent(this.services.input.getMoveIntent());
    if (this.services.input.wasInteractPressed()) this.tryInteract();
    this.checkLandmarkDiscovery();
  }

  get environment(): WorldEnvironment {
    return environmentAt(this.elapsedMs);
  }

  get questState(): string {
    return this.objective;
  }

  setStoryUpdate(callback: (message: string, objective: string) => void): void {
    this.onStoryUpdate = callback;
  }

  private createCityStructures(): void {
    const locale = getInitialLocale(
      window.location.search,
      import.meta.env.VITE_LOCALE,
      navigator.languages.length > 0 ? navigator.languages : [navigator.language],
      readStoredLocale(),
    );
    for (const structure of CITY_STRUCTURES) {
      const building = this.add
        .rectangle(
          structure.x + structure.width / 2,
          structure.y + structure.height / 2,
          structure.width,
          structure.height,
          structure.color,
        )
        .setStrokeStyle(4, 0x2f3e46)
        .setDepth(structure.y + structure.height);
      this.physics.add.existing(building, true);
      const buildingBody = building.body as Phaser.Physics.Arcade.StaticBody;
      buildingBody.setSize(structure.width, structure.height);
      this.physics.add.collider(this._player.sprite, building);
      this.add
        .text(structure.x + 10, structure.y + 10, textForLocale(structure.name, locale), {
          fontFamily: 'system-ui, "Noto Sans Thai", sans-serif',
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#18231dcc',
          padding: { x: 6, y: 4 },
        })
        .setDepth(structure.y + structure.height + 1);
    }
  }

  private createCityContent(): void {
    const locale = getInitialLocale(
      window.location.search,
      import.meta.env.VITE_LOCALE,
      navigator.languages.length > 0 ? navigator.languages : [navigator.language],
      readStoredLocale(),
    );
    for (const npc of CITY_NPCS) {
      const sprite = this.physics.add.sprite(npc.x, npc.y, TextureKeys.Npc).setDepth(npc.y);
      sprite.setData('npc', npc);
      this.markers.push(sprite);
      this.add
        .text(npc.x - 30, npc.y - 48, textForLocale(npc.name, locale), {
          fontFamily: 'system-ui, "Noto Sans Thai", sans-serif',
          fontSize: '14px',
          color: '#fff4db',
          backgroundColor: '#3b2d2a',
          padding: { x: 5, y: 3 },
        })
        .setDepth(npc.y + 1);
    }
    for (const landmark of CITY_LANDMARKS) {
      const sprite = this.add
        .image(landmark.x, landmark.y, TextureKeys.Landmark)
        .setDepth(landmark.y);
      sprite.setData('landmark', landmark);
      this.markers.push(sprite);
      this.landmarkSprites.set(landmark.id, sprite);
      if (this.discoveredLandmarks.has(landmark.id)) sprite.setTint(0xffe082);
      this.add
        .text(landmark.x - 45, landmark.y - 48, textForLocale(landmark.name, locale), {
          fontFamily: 'system-ui, "Noto Sans Thai", sans-serif',
          fontSize: '14px',
          color: '#eef0ff',
          backgroundColor: '#292b59',
          padding: { x: 5, y: 3 },
        })
        .setDepth(landmark.y + 1);
    }
  }

  private tryInteract(): void {
    const npc = CITY_NPCS.find(
      (candidate) =>
        Phaser.Math.Distance.Between(
          this._player.sprite.x,
          this._player.sprite.y,
          candidate.x,
          candidate.y,
        ) < 72,
    );
    if (!npc) {
      this.interactWithLandmark();
      return;
    }
    const locale = getInitialLocale(
      window.location.search,
      import.meta.env.VITE_LOCALE,
      navigator.languages.length > 0 ? navigator.languages : [navigator.language],
      readStoredLocale(),
    );
    if (npc.questId)
      if (npc.questId === 'listen-to-the-city' && this.objective === 'explore') {
        this.objective = 'find-landmark';
      } else if (npc.questId === 'light-the-park' && this.objective === 'complete') {
        this.objective = 'find-park';
      }
    this.onStoryUpdate?.(textForLocale(npc.greeting, locale), this.objective);
    this.saveMemory();
    return;
  }

  private interactWithLandmark(): void {
    const landmark = CITY_LANDMARKS.find(
      (candidate) =>
        Phaser.Math.Distance.Between(
          this._player.sprite.x,
          this._player.sprite.y,
          candidate.x,
          candidate.y,
        ) < 72,
    );
    if (!landmark || this.discoveredLandmarks.has(landmark.id)) return;
    const locale = getInitialLocale(
      window.location.search,
      import.meta.env.VITE_LOCALE,
      navigator.languages.length > 0 ? navigator.languages : [navigator.language],
      readStoredLocale(),
    );
    this.discoveredLandmarks.add(landmark.id);
    this.onStoryUpdate?.(textForLocale(landmark.description, locale), this.objective);
    this.saveMemory();
  }

  private checkLandmarkDiscovery(): void {
    if (this.objective !== 'find-landmark' && this.objective !== 'find-park') return;
    const quest = this.objective === 'find-landmark' ? CITY_QUESTS[0] : CITY_QUESTS[1];
    const landmark = CITY_LANDMARKS.find((candidate) => candidate.id === quest?.targetId);
    if (!landmark) return;
    if (
      Phaser.Math.Distance.Between(
        this._player.sprite.x,
        this._player.sprite.y,
        landmark.x,
        landmark.y,
      ) < 72
    ) {
      const locale = getInitialLocale(
        window.location.search,
        import.meta.env.VITE_LOCALE,
        navigator.languages.length > 0 ? navigator.languages : [navigator.language],
        readStoredLocale(),
      );
      this.objective = this.objective === 'find-landmark' ? 'complete' : 'complete-lanterns';
      this.landmarkSprites.get(landmark.id)?.setTint(0xffe082);
      this.onStoryUpdate?.(textForLocale(landmark.description, locale), this.objective);
      this.saveMemory();
    }
  }

  private readonly saveMemoryOnExit = (): void => {
    this.saveMemory();
  };

  private saveMemory(): void {
    saveWorldMemory(
      {
        version: WORLD_MEMORY_VERSION,
        questState: this.objective,
        discoveredLandmarks: [...this.discoveredLandmarks],
        player: { x: this._player.sprite.x, y: this._player.sprite.y },
      },
      this.memoryStorage,
    );
  }

  private getMemoryStorage(): MemoryStorage | undefined {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }

  private fitCamera(size: Phaser.Structs.Size): void {
    const bounds = this.physics.world.bounds;
    this.cameras.main.setZoom(
      zoomForViewport(size.width, size.height, bounds.width, bounds.height),
    );
  }
}
