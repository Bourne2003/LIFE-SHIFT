/**
 * Client runtime configuration, read from Vite env vars (see /.env.example).
 * Everything here ships to the browser — never read secrets in this file.
 */
export interface ClientConfig {
  readonly multiplayerEnabled: boolean;
  readonly serverUrl: string;
  /** Build identifier shown in the pause menu so testers can report which build they played. */
  readonly version: string;
}

export const config: ClientConfig = {
  multiplayerEnabled: import.meta.env.VITE_MULTIPLAYER_ENABLED === 'true',
  serverUrl: import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567',
  // CI passes the commit SHA; local builds show "dev".
  version: (import.meta.env.VITE_APP_VERSION as string | undefined)?.slice(0, 7) || 'dev',
};
