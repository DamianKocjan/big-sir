import { default as aboutThisMacConfig } from './aboutThisMac';
import { default as chromeConfig } from './chrome';
import { default as finderConfig } from './finder';
// import { default as spotifyConfig } from './spotify';
import { default as terminalConfig } from './terminal';

export type AppType = 'aboutThisMac' | 'chrome' | 'terminal' | 'finder';
export interface WindowConfig {
  height: number;
  width: number;
  resizeable: boolean;
}

const configs: { [K in AppType]: WindowConfig } = {
  aboutThisMac: aboutThisMacConfig,
  chrome: chromeConfig,
  finder: finderConfig,
  terminal: terminalConfig,
  // [AppType.spotify]: spotifyConfig,
};

export default configs;