import Arweave from 'arweave';
import { WarpFactory, LoggerFactory, ArweaveGatewayBundledInteractionLoader, DEFAULT_LEVEL_DB_LOCATION, ArweaveGatewayBundledContractDefinitionLoader } from "warp-contracts";
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

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
  })
  .use(new DeployPlugin());

const warpWithArLoader = WarpFactory.custom(arweave, WARP_CACHE_OPTIONS, ARWEAVE_ENV)
  .setInteractionsLoader(new ArweaveGatewayBundledInteractionLoader(arweave, ARWEAVE_ENV))
  .setDefinitionLoader(new ArweaveGatewayBundledContractDefinitionLoader(ARWEAVE_ENV))
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