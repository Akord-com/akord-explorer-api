import { Api } from "@akord/akord-js/lib/api/api";
import { Membership, MembershipKeys } from "@akord/akord-js/lib/types/membership";
import { ContractState, Tag } from "@akord/akord-js/lib/types/contract";
import { NodeLike, NodeType } from "@akord/akord-js/lib/types/node";
import { Vault } from "@akord/akord-js/lib/types/vault";
import { Transaction } from "@akord/akord-js/lib/types/transaction";
import { Paginated } from "@akord/akord-js/lib/types/paginated";
import { ListOptions, VaultApiGetOptions } from "@akord/akord-js/lib/types/query-options";
import { getTxData, getTxMetadata } from "@akord/akord-js/lib/arweave";
import { membershipVaultIdQuery, membershipsQuery, nodeVaultIdQuery, timelineQuery } from "./graphql/queries";
import { executeQuery, paginatedQuery, TxNode } from "./graphql/client";
import { WarpFactory, LoggerFactory, DEFAULT_LEVEL_DB_LOCATION, Contract } from "warp-contracts";
import { EncryptionMetadata } from "@akord/akord-js/lib/core";
import { NotFound } from "@akord/akord-js/lib/errors/not-found";

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
    if (!vaultId) {
      vaultId = await this.getVaultIdForNode(id);
    }
    const vault = await this.getVault(vaultId, { withNodes: true });
    const node = vault.nodes.filter(node => node.id === id)[0];
    const dataTx = this.getDataTx(node);
    const state = await this.getNodeState(dataTx);
    return { ...node, ...state, vaultId };
  };

  public async getMembership(id: string, vaultId?: string): Promise<Membership> {
    if (!vaultId) {
      vaultId = await this.getVaultIdForMembership(id);
    }
    const vault = await this.getVault(vaultId, { withMemberships: true });
    const membership = vault.memberships.filter(membership => membership.id === id)[0];
    const dataTx = this.getDataTx(membership);
    const state = await this.getNodeState(dataTx);
    return { ...membership, ...state, vaultId };
  };

  public async getVault(id: string, options?: VaultApiGetOptions & { withMemberships?: boolean }): Promise<Vault> {
    const contract = getContract(id);
    let vault = (await contract.readState()).cachedValue.state;
    const dataTx = this.getDataTx(vault);
    const state = await this.getNodeState(dataTx);
    vault = { ...vault, ...state };
    if (options?.deep || options?.withMemberships) {
      await this.downloadMemberships(vault);
    } else {
      delete vault.memberships;
    }
    if (options?.deep || options?.withNodes) {
      await this.downloadNodes(vault);
    } else {
      delete vault.nodes;
    }
    return vault;
  };

  public async getMembershipKeys(vaultId: string): Promise<MembershipKeys> {
    const vault = await this.getVault(vaultId, { withMemberships: true });
    const membership = vault.memberships.filter(membership => membership.address === this.address)[0];
    const dataTx = this.getDataTx(membership);
    const state = await this.getNodeState(dataTx);
    return { isEncrypted: true, keys: state.keys };
  };

  public async getNodeState(stateId: string): Promise<any> {
    try {
      const result = await getTxData(stateId, "json");
      return result;
    } catch (error) {
      if (error === 404 || error?.response?.status === 404) {
        throw new NotFound("Cannot find state: " + stateId);
      }
    }
  };

  public async getContractState(objectId: string): Promise<ContractState> {
    return <any>this.getVault(objectId, { deep: true });
  };

  public async getMemberships(limit?: number, nextToken?: string): Promise<Paginated<Membership>> {
    const { items, nextToken: nextPage } = await executeQuery(membershipsQuery,
      { address: this.address, nextToken, first: getLimit(limit) });
    const memberships = await Promise.all(items
      .map(async (item: TxNode) => {
        const membershipId = item.tags.filter((tag: Tag) => tag.name === "Membership-Id")[0]?.value;
        const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
        const membership = await this.getMembership(membershipId, vaultId);
        return membership;
      })) as Array<Membership>;
    return { items: memberships, nextToken: nextPage };
  };

  public async getVaults(filter = {}, limit?: number, nextToken?: string): Promise<Paginated<Vault>> {
    const { items, nextToken: nextPage } = await executeQuery(membershipsQuery,
      { address: this.address, nextToken, first: getLimit(limit) });
    const vaults = await Promise.all(items
      .map(async (item: TxNode) => {
        const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
        const vault = await this.getVault(vaultId);
        return vault;
      })) as Array<Vault>;
    return { items: vaults, nextToken: nextPage };
  };

  public async getNodesByVaultId<T>(vaultId: string, type: NodeType, options: ListOptions): Promise<Paginated<T>> {
    const vault = await this.getVault(vaultId, { withNodes: true });
    const results = await Promise.all(vault.nodes
      .filter((node: NodeLike) => node.type === type)
      .map(async (node: NodeLike) => {
        const dataTx = this.getDataTx(node);
        const state = await this.getNodeState(dataTx);
        return { ...node, ...state };
      }));
    return { items: results as Array<T>, nextToken: "null" };
  };

  public async getMembershipsByVaultId(vaultId: string, options: ListOptions): Promise<Paginated<Membership>> {
    const vault = await this.getVault(vaultId, { withMemberships: true });
    const results = await Promise.all(vault.memberships
      .map(async (membership: Membership) => {
        const dataTx = this.getDataTx(membership);
        const state = await this.getNodeState(dataTx);
        return { ...membership, ...state };
      }));
    return { items: results, nextToken: "null" };
  };

  public async getTransactions(vaultId: string): Promise<Array<Transaction>> {
    return await <any>paginatedQuery(timelineQuery, { vaultId });
  };

  public async downloadFile(id: string): Promise<{ fileData: ArrayBuffer, metadata: EncryptionMetadata }> {
    const fileData = await getTxData(id);
    const txMetadata = await getTxMetadata(id);
    const metadata = {
      iv: txMetadata.tags.find((tag: Tag) => tag.name === "Initialization-Vector")?.value,
      encryptedKey: txMetadata.tags.find((tag: Tag) => tag.name === "Encrypted-Key")?.value
    }
    return { fileData, metadata };
  };

  public async getUser(): Promise<any> {
    return null;
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

  private getDataTx(object: Vault | Membership | NodeLike) {
    return object.data?.[object.data.length - 1];
  };

  private async downloadMemberships(vault: Vault) {
    await Promise.all(vault.memberships
      .map(async (membership: Membership) => {
        const dataTx = this.getDataTx(membership);
        const state = await this.getNodeState(dataTx);
        return { ...membership, ...state, vaultId: vault.id };
      }));
  };

  private async downloadNodes(vault: Vault) {
    vault.folders = [];
    vault.stacks = [];
    vault.memos = [];
    await Promise.all(vault.nodes
      .map(async (node: NodeLike) => {
        const dataTx = this.getDataTx(node);
        const state = await this.getNodeState(dataTx);
        vault[node.type.toLowerCase() + "s"].push(node);
        return { ...node, ...state, vaultId: vault.id };
      }));
  };

  private async getVaultIdForNode(nodeId: string): Promise<string> {
    const items = await paginatedQuery(nodeVaultIdQuery,
      { id: nodeId });
    const vaultId = items?.[0]?.tags.filter((tag: Tag) => tag.name === "Vault-Id")[0]?.value;
    if (!vaultId) {
      throw new NotFound("Unable to retrieve the vault context.")
    }
    return vaultId;
  };

  private async getVaultIdForMembership(membershipId: string): Promise<string> {
    const items = await paginatedQuery(membershipVaultIdQuery,
      { id: membershipId });
    const vaultId = items?.[0]?.tags.filter((tag: Tag) => tag.name === "Vault-Id")[0]?.value;
    if (!vaultId) {
      throw new NotFound("Unable to retrieve the vault context.")
    }
    return vaultId;
  };
}

export {
  ExplorerApi
}
