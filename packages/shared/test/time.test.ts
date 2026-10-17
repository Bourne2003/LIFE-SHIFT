import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE,
  MINUTES_PER_DAY,
  NIGHT_DARKNESS,
  RAIN_CHANCE,
  START_CLOCK,
  advanceClock,
  conditionHolds,
  darkness,
  dayPhase,
  formatClock,
  weatherForDay,
} from '../src';

const at = (h: number, m = 0) => h * 60 + m;

describe('game clock', () => {
  it('starts on day 1 at 08:00', () => {
    expect(START_CLOCK).toEqual({ day: 1, minute: at(8) });
    expect(INITIAL_STATE.clock).toBe(START_CLOCK);
  });

  it('advances and rolls over into the next day', () => {
    expect(advanceClock({ day: 1, minute: at(8) }, 30)).toEqual({ day: 1, minute: at(8, 30) });
    expect(advanceClock({ day: 1, minute: at(23, 50) }, 20)).toEqual({ day: 2, minute: 10 });
    expect(advanceClock({ day: 1, minute: 0 }, MINUTES_PER_DAY * 2).day).toBe(3);
  });

  it('ignores zero, negative and invalid time steps', () => {
    const c = { day: 1, minute: 100 };
    expect(advanceClock(c, 0)).toBe(c);
    expect(advanceClock(c, -5)).toBe(c);
    expect(advanceClock(c, Number.NaN)).toBe(c);
  });

  it('formats as a 24-hour clock', () => {
    expect(formatClock(at(8, 5))).toBe('08:05');
    expect(formatClock(at(23, 59) + 0.9)).toBe('23:59');
  });
});

describe('day phases and darkness', () => {
  it('names the time of day', () => {
    expect(dayPhase(at(6))).toBe('morning');
    expect(dayPhase(at(12))).toBe('day');
    expect(dayPhase(at(18))).toBe('evening');
    expect(dayPhase(at(22))).toBe('night');
    expect(dayPhase(at(3))).toBe('night');
  });

  it('is light by day, dark by night, and fades between', () => {
    expect(darkness(at(12))).toBe(0);
    expect(darkness(at(0))).toBe(NIGHT_DARKNESS);
    const dusk = darkness(at(18, 30));
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(NIGHT_DARKNESS);
    expect(darkness(at(6))).toBeCloseTo(NIGHT_DARKNESS / 2);
  });
});

describe('weather', () => {
  it('is deterministic, clear on day 1, and rains on roughly RAIN_CHANCE of days', () => {
    expect(weatherForDay(1)).toBe('clear');
    expect(weatherForDay(42)).toBe(weatherForDay(42));
    const days = Array.from({ length: 1000 }, (_, i) => weatherForDay(i + 2));
    const rainy = days.filter((w) => w === 'rain').length / days.length;
    expect(rainy).toBeGreaterThan(RAIN_CHANCE - 0.06);
    expect(rainy).toBeLessThan(RAIN_CHANCE + 0.06);
  });

  it('feeds story conditions', () => {
    const rainyDay = Array.from({ length: 50 }, (_, i) => i + 2).find(
      (d) => weatherForDay(d) === 'rain',
    )!;
    const s = { ...INITIAL_STATE, clock: { day: rainyDay, minute: at(22) } };
    expect(conditionHolds(s, { weather: 'rain' })).toBe(true);
    expect(conditionHolds(s, { phase: ['night'] })).toBe(true);
    expect(conditionHolds(INITIAL_STATE, { phase: ['night', 'evening'] })).toBe(false);
  });
});
