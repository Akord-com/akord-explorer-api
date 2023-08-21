export const GatewayUrls = [
  "https://arweave.net/",
  "https://ar-io.net/",
  "https://g8way.io/"
];

export const defaultApiConfig = {
  env: "v2",
  arweaveUrl: GatewayUrls[0],
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