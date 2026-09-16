export const environment = {
  production: false,
  /** Routed through the dev-server proxy (see proxy.conf.json). */
  apiBaseUrl: '/api',
} as const;

export type Environment = typeof environment;
