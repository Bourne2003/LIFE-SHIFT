import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE,
  TILE_SIZE,
  isNpcPresent,
  locationAt,
  validateContent,
  visitedFlag,
  type GameContent,
  type LocationDef,
} from '../src';

const t = (s: string) => ({ th: s, en: s });
const loc = (id: string, x: number, y: number, w: number, h: number): LocationDef => ({
  id,
  name: t(id),
  xTiles: x,
  yTiles: y,
  widthTiles: w,
  heightTiles: h,
});

describe('locationAt', () => {
  const locations = [loc('park', 0, 0, 10, 10), loc('pond', 2, 2, 2, 2)];
  const px = (tx: number, ty: number) => ({ x: tx * TILE_SIZE, y: ty * TILE_SIZE });

  it('finds the area a point is in, preferring the smallest', () => {
    expect(locationAt(px(5, 5), locations)?.id).toBe('park');
    expect(locationAt(px(3, 3), locations)?.id).toBe('pond');
    expect(locationAt(px(10, 5), locations)).toBeUndefined(); // right edge is outside
  });
});

describe('NPC presence', () => {
  it('follows presentWhen conditions', () => {
    const cat = {
      id: 'cat',
      name: t('cat'),
      xTiles: 0,
      yTiles: 0,
      dialogue: [{ dialogue: 'd' }],
      presentWhen: [{ flag: 'cat-home' }],
    };
    expect(isNpcPresent(cat, INITIAL_STATE)).toBe(false);
    expect(isNpcPresent(cat, { ...INITIAL_STATE, flags: { 'cat-home': true } })).toBe(true);
    expect(isNpcPresent({ ...cat, presentWhen: undefined as never }, INITIAL_STATE)).toBe(true);
  });
});

describe('validateContent (locations)', () => {
  const base: GameContent = {
    quests: {},
    items: {},
    shops: {},
    props: [],
    dialogues: { d: { id: 'd', start: 'a', nodes: { a: { text: t('hi') } } } },
    npcs: [
      {
        id: 'n',
        name: t('N'),
        xTiles: 0,
        yTiles: 0,
        dialogue: [{ when: [{ flag: visitedFlag('alley') }], dialogue: 'd' }, { dialogue: 'd' }],
      },
    ],
    locations: [loc('alley', 0, 0, 1, 1)],
  };

  it('treats visited flags of real locations as set', () => {
    expect(validateContent(base)).toEqual([]);
  });

  it('reports duplicate locations, missing names and visited flags of unknown places', () => {
    const broken: GameContent = {
      ...base,
      locations: [loc('x', 0, 0, 1, 1), { ...loc('x', 0, 0, 0, 1), name: { th: '', en: 'x' } }],
    };
    expect(validateContent(broken)).toEqual(
      expect.arrayContaining([
        'location "x": duplicate id',
        'location "x" name: missing translation (th)',
        'location "x": empty area',
        'npc "n": flag "visited:alley" is never set',
      ]),
    );
  });
});
