import Arweave from 'arweave';
import { WarpFactory, LoggerFactory, ArweaveGatewayBundledInteractionLoader, WarpGatewayContractDefinitionLoader, LevelDbCache, ContractCache, SrcCache } from "warp-contracts";
import { Vault } from "@akord/akord-js";

const ARWEAVE_ENV = 'mainnet';
const WARP_CACHE_OPTIONS = {
  inMemory: true,
  dbLocation: ''
};

// Set up Arweave client
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https"
}) as any;

// Set up Warp client
const contractsCache = new LevelDbCache<ContractCache<Vault>>(WARP_CACHE_OPTIONS);

// Separate cache for sources to minimize duplicates
const sourceCache = new LevelDbCache<SrcCache>(WARP_CACHE_OPTIONS);

LoggerFactory.INST.logLevel("error");

const warpWithArLoader = WarpFactory.custom(arweave, WARP_CACHE_OPTIONS, ARWEAVE_ENV)
  .setInteractionsLoader(new ArweaveGatewayBundledInteractionLoader(arweave, ARWEAVE_ENV))
  .setDefinitionLoader(
    new WarpGatewayContractDefinitionLoader(arweave, contractsCache, sourceCache, ARWEAVE_ENV)
  )
  .build();

const readContractState = async <T>(contractId: string): Promise<T> => {
  const evalStateResult = await warpWithArLoader
    .contract<T>(contractId)
    .setEvaluationOptions({ allowBigInt: true })
    .readState();
  return evalStateResult.cachedValue.state;
};

export { readContractState };