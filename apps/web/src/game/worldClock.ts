export type WorldPeriod = 'morning' | 'day' | 'evening' | 'night';
export type Weather = 'clear' | 'rain';

export interface WorldEnvironment {
  readonly period: WorldPeriod;
  readonly weather: Weather;
  readonly progress: number;
}

const DAY_LENGTH_MS = 120_000;

export function environmentAt(elapsedMs: number): WorldEnvironment {
  const safeElapsed = Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0;
  const progress = (safeElapsed % DAY_LENGTH_MS) / DAY_LENGTH_MS;
  const period: WorldPeriod =
    progress < 0.2 ? 'morning' : progress < 0.65 ? 'day' : progress < 0.82 ? 'evening' : 'night';
  const weather: Weather = Math.floor(safeElapsed / 30_000) % 4 === 2 ? 'rain' : 'clear';
  return { period, weather, progress };
}
