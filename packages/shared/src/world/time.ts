/** In-game minutes per real second: a full day takes 24 real minutes. */
export const GAME_MINUTES_PER_SECOND = 1;
export const MINUTES_PER_DAY = 24 * 60;
/** A new game starts on day 1 at 08:00. */
export const START_CLOCK: GameClock = Object.freeze({ day: 1, minute: 8 * 60 });

export interface GameClock {
  /** 1-based day counter. */
  readonly day: number;
  /** Minutes since midnight, 0 ≤ minute < 1440 (fractional while running). */
  readonly minute: number;
}

export type DayPhase = 'morning' | 'day' | 'evening' | 'night';
export type Weather = 'clear' | 'rain';

/** Moves the clock forward by real seconds, rolling over into the next day. */
export function advanceClock(clock: GameClock, realSeconds: number): GameClock {
  if (!(realSeconds > 0)) return clock;
  const total = clock.minute + realSeconds * GAME_MINUTES_PER_SECOND;
  const days = Math.floor(total / MINUTES_PER_DAY);
  return { day: clock.day + days, minute: total - days * MINUTES_PER_DAY };
}

export function dayPhase(minute: number): DayPhase {
  const h = Math.floor(minute / 60);
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

/** Max darkness (overlay opacity) in the middle of the night. */
export const NIGHT_DARKNESS = 0.6;

/**
 * How dark the world is, 0 (full daylight) to NIGHT_DARKNESS. Dusk 17:00–20:00 and dawn
 * 05:00–07:00 fade smoothly so time passing is visible but never jarring.
 */
export function darkness(minute: number): number {
  const h = minute / 60;
  const ramp = (x: number) => Math.min(1, Math.max(0, x));
  if (h >= 7 && h < 17) return 0;
  if (h >= 17 && h < 20) return NIGHT_DARKNESS * ramp((h - 17) / 3);
  if (h >= 5 && h < 7) return NIGHT_DARKNESS * (1 - ramp((h - 5) / 2));
  return NIGHT_DARKNESS;
}

/** "08:05" — 24-hour clock, as Thai and most of the world read it. */
export function formatClock(minute: number): string {
  const m = Math.floor(minute) % MINUTES_PER_DAY;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Chance of a rainy day. */
export const RAIN_CHANCE = 0.3;

/**
 * The weather of a day. Deterministic (a hash of the day number), so it needs no saving, is the
 * same after a reload, and a future server can agree with every client. Day 1 is always clear.
 */
export function weatherForDay(day: number): Weather {
  if (day <= 1) return 'clear';
  // Integer hash (mulberry32 step) → [0, 1).
  let t = (day * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return r < RAIN_CHANCE ? 'rain' : 'clear';
}
