import { Api } from "@akord/akord-js/lib/api/api";
import { Membership, MembershipKeys } from "@akord/akord-js/lib/types/membership";
import { ContractState, Tag } from "@akord/akord-js/lib/types/contract";
import { NodeLike, NodeType } from "@akord/akord-js/lib/types/node";
import { Vault } from "@akord/akord-js/lib/types/vault";
import { Transaction } from "@akord/akord-js/lib/types/transaction";
import { Paginated } from "@akord/akord-js/lib/types/paginated";
import { ListOptions, VaultApiGetOptions } from "@akord/akord-js/lib/types/query-options";
import { getTxData, getTxMetadata } from "@akord/akord-js/lib/arweave";
import { membershipsQuery, timelineQuery } from "./graphql/queries";
import { executeQuery, paginatedQuery } from "./graphql/client";
import { WarpFactory, LoggerFactory, DEFAULT_LEVEL_DB_LOCATION, Contract } from "warp-contracts";
import axios, { AxiosRequestConfig } from "axios";

// import Arweave from 'arweave';
// // Set up Arweave client
// const arweave = Arweave.init({
//   host: "arweave.net",
//   port: 443,
//   protocol: "https"
// });

const ARWEAVE_URL = "https://arweave.net/";
const DEFAULT_LIMIT = 100, MAX_LIMIT = 100;

// Set up SmartWeave client
LoggerFactory.INST.logLevel("error");
const smartweave = WarpFactory.forMainnet({
  inMemory: true,
  dbLocation: DEFAULT_LEVEL_DB_LOCATION,
});

const getContract = (contractId: string): Contract<Vault> => {
  const contract = smartweave
    .contract<Vault>(contractId)
  return contract;
};

const getLimit = (limit?: number): number => {
  if (limit && limit <= MAX_LIMIT) {
    return limit;
  } else {
    return DEFAULT_LIMIT;
  }
};

export default class ExplorerApi extends Api {

  address: string;

  constructor(address: string) {
    super();
    this.address = address;
  }

  public async getNode<T>(id: string, type: NodeType, vaultId?: string): Promise<T> {
    const vault = await this.getVault(vaultId);
    const node = vault.nodes.filter(node => node.id === id)[0];
    const dataTx = node.data?.[node.data.length - 1];
    const state = await this.getNodeState(dataTx);
    return { ...node, ...state };
  };

  public async getMembership(id: string, vaultId?: string): Promise<Membership> {
    const vault = await this.getVault(vaultId);
    const membership = vault.memberships.filter(membership => membership.id === id)[0];
    const dataTx = membership.data?.[membership.data.length - 1];
    const state = await this.getNodeState(dataTx);
    return { ...membership, ...state };
  };

  public async getVault(id: string, options?: VaultApiGetOptions): Promise<Vault> {
    const contractObject = getContract(id);
    let vault = (await contractObject.readState()).cachedValue.state;
    const dataTx = vault.data[vault.data.length - 1];
    const state = await this.getNodeState(dataTx);
    vault = { ...vault, ...state };
    if (options.deep) {
      await this.downloadMemberships(vault);
      await this.downloadNodes(vault);
    }
    return vault;
  };

  public async getMembershipKeys(vaultId: string): Promise<MembershipKeys> {
    const vault = await this.getVault(vaultId);
    const membership = vault.memberships.filter(membership => membership.address === this.address)[0];
    const dataTx = membership.data?.[membership.data.length - 1];
    const state = await this.getNodeState(dataTx);
    return { isEncrypted: true, keys: state.keys };
  };

  public async getNodeState(stateId: string): Promise<any> {
    const config = {
      method: "get",
      url: ARWEAVE_URL + stateId,
      responseType: "json"
    } as AxiosRequestConfig;
    try {
      const response = await axios(config);
      if (response.status == 200 || response.status == 202) {
        return response.data;
      } else if (response.status === 404) {
        return {};
      } else {
        throw new Error(JSON.stringify(response));
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return {};
      }
      throw new Error(error.response?.status);
    }
  };

  public async getContractState(objectId: string): Promise<ContractState> {
    return <any>this.getVault(objectId, { deep: true });
  };

  public async getMemberships(limit?: number, nextToken?: string): Promise<Paginated<Membership>> {
    const { items, nextToken: nextPage } = await executeQuery(membershipsQuery,
      { address: this.address, nextToken, first: getLimit(limit) });
    const memberships = [] as Array<Membership>;
    for (let item of items) {
      const membershipId = item.tags.filter((tag: Tag) => tag.name === "Membership-Id")[0]?.value;
      const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
      const membership = await this.getMembership(membershipId, vaultId);
      memberships.push(membership);
    }
    return { items: memberships, nextToken: nextPage };
  };

  public async getVaults(filter = {}, limit?: number, nextToken?: string): Promise<Paginated<Vault>> {
    const { items, nextToken: nextPage } = await executeQuery(membershipsQuery,
      { address: this.address, nextToken, first: getLimit(limit) });
    const vaults = [] as Array<Vault>;
    for (let item of items) {
      const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
      const vault = await this.getVault(vaultId);
      vaults.push(vault);
    }
    return { items: vaults, nextToken: nextPage };
  };

  public async getNodesByVaultId<T>(vaultId: string, type: NodeType, options: ListOptions): Promise<Paginated<T>> {
    const vault = await this.getVault(vaultId);
    const results = await Promise.all(vault.nodes
      .filter((node: NodeLike) => node.type === type)
      .map(async (node: NodeLike) => {
        const dataTx = node.data[node.data.length - 1];
        const state = await this.getNodeState(dataTx);
        return { ...node, ...state };
      }));
    return { items: results as Array<T>, nextToken: "null" };
  };

  public async getMembershipsByVaultId(vaultId: string, options: ListOptions): Promise<Paginated<Membership>> {
    const vault = await this.getVault(vaultId);
    const results = await Promise.all(vault.memberships
      .map(async (membership: Membership) => {
        const dataTx = membership.data[membership.data.length - 1];
        const state = await this.getNodeState(dataTx);
        return { ...membership, ...state };
      }));
    return { items: results, nextToken: "null" };
  };

  public async getTransactions(vaultId: string): Promise<Array<Transaction>> {
    return await paginatedQuery(timelineQuery, { vaultId });
  }

  public async downloadFile(id: string): Promise<{ fileData: ArrayBuffer, headers: any }> {
    const file = await getTxData(id);
    const metadata = await getTxMetadata(id);
    const iv = metadata.tags.find((tag: Tag) => tag.name === "Initialization-Vector")?.value;
    const encryptedKey = metadata.tags.find((tag: Tag) => tag.name === "Encrypted-Key")?.value;
    const headers = {
      "x-amz-meta-iv": iv,
      "x-amz-meta-encryptedkey": encryptedKey
    }
    return { fileData: file, headers };
  };

  // The explorer API is read-only, hence the following methods are not implemented

  public async getMembers(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async uploadData(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async postContractTransaction(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async initContractId(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async uploadFile(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async existsUser(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async getUserPublicData(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async getUser(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async updateUser(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async deleteVault(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async inviteNewUser(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async revokeInvite(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async inviteResend(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async getNotifications(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  public async readNotifications(): Promise<any> {
    throw new Error("Method not implemented.");
  };

  private async downloadMemberships(vault: Vault) {
    for (let membership of vault.memberships) {
      const dataTx = membership.data[membership.data.length - 1];
      const state = await this.getNodeState(dataTx);
      membership = { ...membership, ...state };
    }
  }

  private async downloadNodes(vault: Vault) {
    vault.folders = [];
    vault.stacks = [];
    vault.memos = [];
    for (let node of vault.nodes) {
      const dataTx = node.data[node.data.length - 1];
      const state = await this.getNodeState(dataTx);
      node = { ...node, ...state };
      vault[node.type.toLowerCase() + "s"].push(node);
    }
  }
}

export {
  ExplorerApi
}
