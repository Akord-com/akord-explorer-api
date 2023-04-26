import { Api } from "@akord/akord-js/lib/api/api";
import { Membership, MembershipKeys } from "@akord/akord-js/lib/types/membership";
import { ContractState, Tag } from "@akord/akord-js/lib/types/contract";
import { NodeLike, NodeType } from "@akord/akord-js/lib/types/node";
import { Vault } from "@akord/akord-js/lib/types/vault";
import { Transaction } from "@akord/akord-js/lib/types/transaction";
import { Paginated } from "@akord/akord-js/lib/types/paginated";
import { ListOptions, VaultApiGetOptions } from "@akord/akord-js/lib/types/query-options";
import { getTxData } from "@akord/akord-js/lib/arweave";
import { membershipsQuery, timelineQuery } from "./graphql/queries";
import { executeQuery, paginatedQuery } from "./graphql/client";
import { WarpFactory, LoggerFactory, DEFAULT_LEVEL_DB_LOCATION, Contract } from "warp-contracts";

// import Arweave from 'arweave';
// // Set up Arweave client
// const arweave = Arweave.init({
//   host: "arweave.net",
//   port: 443,
//   protocol: "https"
// });

const ARWEAVE_URL = "https://arweave.net/";

// Set up SmartWeave client
LoggerFactory.INST.logLevel("error");
const smartweave = WarpFactory.forMainnet({
  inMemory: true,
  dbLocation: DEFAULT_LEVEL_DB_LOCATION,
}, true);

const getContract = (contractId: string): Contract<Vault> => {
  const contract = smartweave
    .contract<Vault>(contractId)
  return contract;
};

export default class ExplorerApi extends Api {

  constructor() {
    super();
  }

  public async getNode<T>(id: string, type: NodeType, vaultId?: string): Promise<T> {
    const vault = await this.getContractState(vaultId);
    const node = vault.nodes.filter(node => node.id === id)[0];
    const dataTx = node.data?.[node.data.length - 1];
    const state = dataTx ? await this.getNodeState(dataTx) : {};
    return { ...node, ...state };
  };

  public async getMembership(id: string, vaultId?: string): Promise<Membership> {
    const vault = await this.getContractState(vaultId);
    const membership = vault.memberships.filter(membership => membership.id === id)[0];
    const dataTx = membership.data?.[membership.data.length - 1];
    const state = dataTx ? await this.getNodeState(dataTx) : {};
    return { ...membership, ...state };
  };

  public async getVault(id: string, options?: VaultApiGetOptions): Promise<Vault> {
    const vault = await this.getContractState(id);
    return vault;
  };

  public async getMembershipKeys(vaultId: string, address?: string): Promise<MembershipKeys> {
    const vault = await this.getContractState(vaultId);
    const membership = vault.memberships.filter(membership => membership.address === address)[0];
    const dataTx = membership.data?.[membership.data.length - 1];
    const state = dataTx ? await this.getNodeState(dataTx) : {};
    return { isEncrypted: true, keys: state.keys };
  };

  public async getNodeState(stateId: string): Promise<any> {
    const response = await fetch(ARWEAVE_URL + stateId);
    return await response.json();
  };

  public async getContractState(objectId: string): Promise<ContractState> {
    const contractObject = getContract(objectId);
    const contract = (await contractObject.readState()).cachedValue;
    let vault = Object.assign(contract) as Vault;
    const state = await this.downloadFile(vault.data[vault.data.length - 1])
    vault = { ...vault, ...state };
    await this.downloadMemberships(vault);
    await this.downloadNodes(vault);
    return <any>vault;
  };

  public async getMemberships(limit?: number, nextToken?: string, address?: string): Promise<Paginated<Membership>> {
    const { items, nextToken: nextPage } = await executeQuery(membershipsQuery, { address, nextToken });
    const memberships = [];
    for (let item of items) {
      const membershipId = item.tags.filter((tag: Tag) => tag.name === "Membership-Id")[0]?.value;
      const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
      const vault = await this.getMembership(membershipId, vaultId);
      memberships.push(vault);
    }
    return { items: memberships, nextToken: nextPage };
  };

  public async getVaults(filter = {}, limit?: number, nextToken?: string, address?: string): Promise<Paginated<Vault>> {
    const { items, nextToken: nextPage } = await executeQuery(membershipsQuery, { address, nextToken });
    const vaults = [];
    for (let item of items) {
      const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
      const vault = await this.getContractState(vaultId);
      vaults.push(vault);
    }
    return { items: vaults, nextToken: nextPage };
  };

  public async getNodesByVaultId<T>(vaultId: string, type: NodeType, options: ListOptions): Promise<Paginated<T>> {
    const vault = await this.getContractState(vaultId);
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
    const vault = await this.getContractState(vaultId);
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

  public async downloadFile(id: string): Promise<any> {
    const file = await getTxData(id);
    return { fileData: file, headers: "" };
  };

  private async downloadMemberships(vault: Vault) {
    for (let membership of vault.memberships) {
      const dataTx = membership.data[membership.data.length - 1];
      const state = await this.downloadFile(dataTx);
      membership = { ...membership, ...state };
    }
  }

  private async downloadNodes(vault: Vault) {
    vault.folders = [];
    vault.stacks = [];
    vault.memos = [];
    for (let node of vault.nodes) {
      const dataTx = node.data[node.data.length - 1];
      const state = await this.downloadFile(dataTx);
      node = { ...node, ...state };
      vault[node.type.toLowerCase() + "s"].push(node);
    }
  }

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
}

export {
  ExplorerApi
}
