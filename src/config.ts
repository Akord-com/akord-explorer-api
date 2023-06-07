export const defaultApiConfig = {
  env: "v2",
  arweaveUrl: "https://arweave.net/",
} as ApiConfig;

export const initConfig = (config: ApiConfig = defaultApiConfig) => {
  return {
    ...defaultApiConfig,
    ...config,
    protocolName: config.env !== "dev" ? "Akord" : "Akord-Dev"
  }
};

export interface ApiConfig {
  env?: "dev" | "v2",
  address?: string,
  arweaveUrl?: string,
  debug?: boolean,
  protocolName?: string
}