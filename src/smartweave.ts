import Arweave from 'arweave';
import { WarpFactory, LoggerFactory, ArweaveGatewayBundledInteractionLoader, WarpGatewayContractDefinitionLoader, LevelDbCache, ContractCache, SrcCache, DEFAULT_LEVEL_DB_LOCATION } from "warp-contracts";
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

// Set up SmartWeave client
LoggerFactory.INST.logLevel("error");
const smartweave = WarpFactory
  .forMainnet({
    inMemory: true,
    dbLocation: DEFAULT_LEVEL_DB_LOCATION,
  });

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

const getContract = (contractId: string, wallet: any) => {
  const contract = smartweave
    .contract(contractId)
  if (wallet) {
    return contract.connect(wallet);
  }
  return contract;
};

export { readContractState, smartweave, getContract };