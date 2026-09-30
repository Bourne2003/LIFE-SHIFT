/**
 * Client runtime configuration, read from Vite env vars (see /.env.example).
 * Everything here ships to the browser — never read secrets in this file.
 */
export interface ClientConfig {
  readonly multiplayerEnabled: boolean;
  readonly serverUrl: string;
}

export const config: ClientConfig = {
  multiplayerEnabled: import.meta.env.VITE_MULTIPLAYER_ENABLED === 'true',
  serverUrl: import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567',
};
