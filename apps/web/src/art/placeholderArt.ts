import type Phaser from 'phaser';
import { TILE_KINDS, TILE_SIZE } from '@life-shift/shared';

/**
 * Programmer art drawn at boot so the prototype needs no image files. Everything here is
 * replaceable: load real images under the same texture keys and delete this module.
 */

type G = Phaser.GameObjects.Graphics;
const T = TILE_SIZE;

const GRASS = 0x5b8c5a;
const PLAZA = 0xc9bfa8;

function ground(g: G, x: number, base: number, speck: number): void {
  g.fillStyle(base).fillRect(x, 0, T, T);
  g.fillStyle(speck)
    .fillRect(x + 6, 21, 2, 2)
    .fillRect(x + 22, 8, 2, 2)
    .fillRect(x + 15, 14, 1, 1);
}

const TILE_PAINTERS: Readonly<Record<string, (g: G, x: number) => void>> = {
  grass: (g, x) => ground(g, x, GRASS, 0x527f51),
  road: (g, x) => {
    g.fillStyle(0x6f6d68).fillRect(x, 0, T, T);
    g.fillStyle(0x7a7873)
      .fillRect(x + 3, 5, 2, 2)
      .fillRect(x + 20, 24, 2, 2);
  },
  path: (g, x) => ground(g, x, 0xb89a6e, 0xa88a5e),
  plaza: (g, x) => {
    g.fillStyle(PLAZA).fillRect(x, 0, T, T);
    g.fillStyle(0xb8ae97)
      .fillRect(x, 0, T, 1)
      .fillRect(x, 0, 1, T)
      .fillRect(x + 16, 0, 1, 16);
    g.fillRect(x, 16, T, 1);
  },
  flowers: (g, x) => {
    ground(g, x, GRASS, 0x527f51);
    g.fillStyle(0xf2d14b)
      .fillRect(x + 5, 6, 3, 3)
      .fillRect(x + 20, 22, 3, 3);
    g.fillStyle(0xe8789a)
      .fillRect(x + 22, 7, 3, 3)
      .fillRect(x + 9, 20, 3, 3);
  },
  water: (g, x) => {
    g.fillStyle(0x3d7fb8).fillRect(x, 0, T, T);
    g.fillStyle(0x6aa5d6)
      .fillRect(x + 4, 9, 10, 2)
      .fillRect(x + 17, 21, 10, 2);
  },
  tree: (g, x) => {
    ground(g, x, GRASS, 0x527f51);
    g.fillStyle(0x6b4a2b).fillRect(x + 13, 20, 6, 10);
    g.fillStyle(0x2f6b3a).fillCircle(x + 16, 13, 12);
    g.fillStyle(0x3d8048).fillCircle(x + 12, 10, 5);
  },
  hedge: (g, x) => {
    g.fillStyle(0x2c5e33).fillRect(x, 0, T, T);
    g.fillStyle(0x3a7342)
      .fillCircle(x + 8, 9, 6)
      .fillCircle(x + 24, 22, 6);
  },
  building: (g, x) => {
    g.fillStyle(0xa8553f).fillRect(x, 0, T, T);
    g.fillStyle(0x8e4533).fillRect(x, 7, T, 2).fillRect(x, 23, T, 2);
  },
  door: (g, x) => {
    g.fillStyle(0xa8553f).fillRect(x, 0, T, T);
    g.fillStyle(0x4a2f1f).fillRect(x + 8, 8, 16, 24);
    g.fillStyle(0xe0c068).fillRect(x + 20, 20, 2, 2);
  },
  stall: (g, x) => {
    g.fillStyle(PLAZA).fillRect(x, 0, T, T);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i % 2 ? 0xffffff : 0xd9544f).fillRect(x + i * 8, 2, 8, 12);
    }
    g.fillStyle(0x8a6a44).fillRect(x + 2, 14, T - 4, 14);
    g.fillStyle(0xf29b38)
      .fillCircle(x + 9, 18, 3)
      .fillCircle(x + 20, 19, 3);
  },
  tower: (g, x) => {
    g.fillStyle(0x8c8a84).fillRect(x, 0, T, T);
    g.fillStyle(0x76746f)
      .fillRect(x, 15, T, 2)
      .fillRect(x + 15, 0, 2, T);
    g.fillStyle(0xf4efe1).fillCircle(x + 16, 16, 9);
    g.fillStyle(0x222222)
      .fillRect(x + 15, 9, 2, 8)
      .fillRect(x + 16, 15, 6, 2);
  },
  fountain: (g, x) => {
    g.fillStyle(PLAZA).fillRect(x, 0, T, T);
    g.fillStyle(0x9a948a).fillCircle(x + 16, 16, 14);
    g.fillStyle(0x5aa0d8).fillCircle(x + 16, 16, 10);
    g.fillStyle(0xbfe0f5).fillCircle(x + 16, 16, 3);
  },
};

/** Draws every tile kind side by side into one tileset texture. */
export function makeTileset(scene: Phaser.Scene, key: string): void {
  const g = scene.make.graphics({}, false);
  TILE_KINDS.forEach((kind, i) => {
    const paint = TILE_PAINTERS[kind.id];
    if (!paint) throw new Error(`No placeholder art for tile kind '${kind.id}'`);
    paint(g, i * T);
  });
  g.generateTexture(key, TILE_KINDS.length * T, T);
  g.destroy();
}

export const CHARACTER_SIZE = { width: 24, height: 32 } as const;

/** A simple person: shadow, body in `bodyColor`, head, and an eye to show facing. */
export function makeCharacter(scene: Phaser.Scene, key: string, bodyColor: number): void {
  const { width: w, height: h } = CHARACTER_SIZE;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x000000, 0.25).fillEllipse(w / 2, h - 3, w - 4, 6);
  g.fillStyle(bodyColor).fillRoundedRect(4, 12, w - 8, h - 16, 4);
  g.fillStyle(0xf2c9a0).fillCircle(w / 2, 9, 7);
  g.fillStyle(0x1b1b1b).fillCircle(w / 2 + 3, 8, 1.5);
  g.generateTexture(key, w, h);
  g.destroy();
}

type ObjectPainter = (g: G) => { width: number; height: number };

function signBoard(
  g: G,
  board: number,
  text: number,
  lit: boolean,
): { width: number; height: number } {
  g.fillStyle(0x000000, 0.25).fillEllipse(16, 29, 20, 5);
  g.fillStyle(0x6b4a2b).fillRect(14, 16, 4, 14);
  g.fillStyle(0x4a2f1f).fillRect(3, 3, 26, 15);
  g.fillStyle(board).fillRect(5, 5, 22, 11);
  g.fillStyle(text).fillRect(8, 8, 16, 2).fillRect(8, 12, 10, 2);
  if (lit) g.fillStyle(0xffe27a).fillCircle(27, 3, 3).fillCircle(5, 3, 3);
  return { width: 32, height: 32 };
}

/** Placeholder art for world objects, keyed by the texture names used in objects.json. */
const OBJECT_PAINTERS: Readonly<Record<string, ObjectPainter>> = {
  sign_closed: (g) => signBoard(g, 0x7a3b33, 0xd9c7b8, false),
  sign_open: (g) => signBoard(g, 0x3f8f4f, 0xfff4c2, true),
};

export function makeObjectTexture(scene: Phaser.Scene, key: string): void {
  const paint = OBJECT_PAINTERS[key];
  if (!paint) throw new Error(`No placeholder art for object texture '${key}'`);
  const g = scene.make.graphics({}, false);
  const { width, height } = paint(g);
  g.generateTexture(key, width, height);
  g.destroy();
}
