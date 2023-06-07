import { Api } from "@akord/akord-js/lib/api/api";
import { ContractState, Tag } from "@akord/akord-js/lib/types/contract";
import { NodeLike, NodeType, Vault, Membership, MembershipKeys, Transaction } from "@akord/akord-js";
import { Paginated } from "@akord/akord-js/lib/types/paginated";
import { ListOptions, VaultApiGetOptions } from "@akord/akord-js/lib/types/query-options";
import { getTxData, getTxMetadata } from "@akord/akord-js/lib/arweave";
import { membershipVaultIdQuery, membershipsQuery, nodeVaultIdQuery, timelineQuery, vaultsByTagsQuery } from "./graphql/queries";
import { ApiClient, TxNode } from "./graphql/client";
import { WarpFactory, LoggerFactory, DEFAULT_LEVEL_DB_LOCATION, Contract } from "warp-contracts";
import { EncryptionMetadata } from "@akord/akord-js/lib/core";
import { NotFound } from "@akord/akord-js/lib/errors/not-found";
import { Unauthorized } from "@akord/akord-js/lib/errors/unauthorized";
import { Forbidden } from "@akord/akord-js/lib/errors/forbidden";
import { BadRequest } from "@akord/akord-js/lib/errors/bad-request";
import { EncryptedKeys } from "@akord/crypto";
import { ApiConfig, defaultApiConfig, initConfig } from "./config";

// import Arweave from 'arweave';
// // Set up Arweave client
// const arweave = Arweave.init({
//   host: "arweave.net",
//   port: 443,
//   protocol: "https"
// });

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

  config: ApiConfig;
  client: ApiClient;

  constructor(config: ApiConfig = defaultApiConfig) {
    super();
    this.config = initConfig(config);
    this.client = new ApiClient(this.config);
  }

  public async getNode<T>(id: string, type: NodeType, vaultId?: string): Promise<T> {
    if (!vaultId) {
      vaultId = await this.getVaultIdForNode(id);
    }
    const vault = await this.getVault(vaultId);
    const node = (vault.nodes ? vault.nodes : []).filter(node => node.id === id)[0];
    const dataTx = this.getDataTx(node);
    const state = await this.getNodeState(dataTx);
    return this.withVaultContext({ ...node, ...state, vaultId }, vault);
  };

  public async getMembership(id: string, vaultId?: string): Promise<Membership> {
    if (!vaultId) {
      vaultId = await this.getVaultIdForMembership(id);
    }
    const vault = await this.getVault(vaultId);
    const membership = (vault.memberships ? vault.memberships : []).filter(membership => membership.id === id)[0];
    const dataTx = this.getDataTx(membership);
    const state = await this.getNodeState(dataTx);
    return this.withVaultContext({ ...membership, ...state, vaultId }, vault);
  };

  public async getVault(id: string, options?: VaultGetOptions): Promise<Vault> {
    const contract = getContract(id);
    let vault = (await contract.readState()).cachedValue.state;
    const dataTx = this.getDataTx(vault);
    const state = await this.getNodeState(dataTx);
    vault = { ...vault, ...state };
    if (!vault.public || options?.deep || options?.withMemberships) {
      await this.downloadMemberships(vault);
    }
    if (options?.withStacks) {
      await this.downloadNodesByType(vault, "Stack");
    }
    if (options?.withFolders) {
      await this.downloadNodesByType(vault, "Folder");
    }
    if (options?.withMemos) {
      await this.downloadNodesByType(vault, "Memo");
    }
    if (options?.deep || options?.withNodes) {
      await this.downloadNodes(vault);
    }
    return this.withVaultContext(vault, vault);
  };

  public async getMembershipKeys(vaultId: string): Promise<MembershipKeys> {
    const vault = await this.getVault(vaultId, { withMemberships: true });
    if (vault.public) {
      return { isEncrypted: false, keys: [] };
    }
    const membership = this.getCurrentMember(vault.memberships);
    return { isEncrypted: true, keys: membership.keys };
  };

  public async getNodeState(stateId: string | undefined): Promise<any> {
    if (!stateId) return null;
    try {
      const result = await getTxData(stateId, "json");
      return result;
    } catch (error) {
      if (error === 404 || (<any>error)?.response?.status === 404) {
        throw new NotFound("Cannot find state: " + stateId);
      }
    }
  };

  public async getContractState(objectId: string): Promise<ContractState> {
    return <any>this.getVault(objectId, { deep: true });
  };

  public async getMemberships(options: ListOptions = {}): Promise<Paginated<Membership>> {
    if (!this.config?.address) {
      throw new BadRequest("Missing wallet address in api configuration.");
    }
    const { items, nextToken: nextPage } = await this.client.executeQuery(membershipsQuery,
      { address: this.config.address, nextToken: options.nextToken, first: getLimit(options.limit) });
    const memberships = await Promise.all(items
      .map(async (item: TxNode) => {
        const membershipId = item.tags.filter((tag: Tag) => tag.name === "Membership-Id")[0]?.value;
        const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
        const membership = await this.getMembership(membershipId, vaultId);
        return membership;
      })) as Array<Membership>;
    return { items: memberships, nextToken: nextPage };
  };

  public async getVaults(options: ListOptions = {}): Promise<Paginated<Vault>> {
    if (!this.config?.address) {
      throw new BadRequest("Missing wallet address in api configuration.");
    }
    const { items, nextToken: nextPage } = await this.client.executeQuery(membershipsQuery,
      { address: this.config.address, nextToken: options.nextToken, first: getLimit(options.limit) });
    const vaults = await Promise.all(items
      .map(async (item: TxNode) => {
        const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
        const vault = await this.getVault(vaultId, { withMemberships: true });
        const membership = vault.memberships?.filter(membership => membership.address === this.config.address)[0];
        if (!membership && !vault.public) {
          throw new Unauthorized("Not valid vault member");
        } else {
          vault.keys = membership?.keys;
        }
        return vault;
      })) as Array<any>;
    return { items: vaults, nextToken: nextPage };
  };

  public async getNodesByVaultId<T>(vaultId: string, type: NodeType, options: ListOptions): Promise<Paginated<T>> {
    const vault = await this.getVault(vaultId, { ["with" + type + "s"]: true, withMemberships: true });
    return {
      items: vault[type.toLowerCase() + "s"]?.map((node: NodeLike) => (this.withVaultContext(node, vault))) as Array<T>,
      nextToken: "null"
    };
  };

  public async getMembershipsByVaultId(vaultId: string, options: ListOptions): Promise<Paginated<Membership>> {
    const vault = await this.getVault(vaultId, { withMemberships: true });
    return {
      items: vault.memberships?.map((membership: Membership) => (this.withVaultContext(membership, vault))) as Array<Membership>,
      nextToken: "null"
    };
  };

  public async getTransactions(vaultId: string): Promise<Array<Transaction>> {
    return await <any>this.client.paginatedQuery(timelineQuery, { vaultId });
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

  public async getVaultsByTags(tags: string[]): Promise<Array<Vault>> {
    const items = await this.client.paginatedQuery(vaultsByTagsQuery,
      { tags: tags });
    const vaults = await Promise.all(items
      .map(async (item: TxNode) => {
        const vaultId = item.tags.filter((tag: Tag) => tag.name === "Contract")[0]?.value;
        const vault = await this.getVault(vaultId);
        return vault;
      })) as Array<Vault>;
    const filteredVaults = vaults.filter((vault: Vault) => vault.public && tags?.every((tag: string) => vault.tags?.includes(tag)));
    // remove duplicates
    return [...new Map(filteredVaults.map(item => [item.id, item])).values()];
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
    vault.memberships = await Promise.all((vault.memberships ? vault.memberships : [])
      .map(async (membership: Membership) => {
        const dataTx = this.getDataTx(membership);
        const state = await this.getNodeState(dataTx);
        return { ...membership, ...state, vaultId: vault.id };
      }));
  };

  private async downloadNodesByType(vault: Vault, type: NodeType) {
    vault.folders = [];
    vault.stacks = [];
    vault.memos = [];
    vault.nodes = await Promise.all((vault.nodes ? vault.nodes : [])
      .map(async (node: NodeLike) => {
        if (node.type === type) {
          const dataTx = this.getDataTx(node);
          const state = await this.getNodeState(dataTx);
          vault[node.type.toLowerCase() + "s"].push({ ...node, ...state, vaultId: vault.id });
          return { ...node, ...state, vaultId: vault.id };
        }
        return node;
      }));
  };

  private async downloadNodes(vault: Vault) {
    vault.folders = [];
    vault.stacks = [];
    vault.memos = [];
    vault.nodes = await Promise.all((vault.nodes ? vault.nodes : [])
      .map(async (node: NodeLike) => {
        const dataTx = this.getDataTx(node);
        const state = await this.getNodeState(dataTx);
        vault[node.type.toLowerCase() + "s"].push({ ...node, ...state, vaultId: vault.id });
        return { ...node, ...state, vaultId: vault.id };
      }));
  };

  private async getVaultIdForNode(nodeId: string): Promise<string> {
    const items = await this.client.paginatedQuery(nodeVaultIdQuery,
      { id: nodeId });
    const vaultId = items?.[0]?.tags.filter((tag: Tag) => tag.name === "Vault-Id")[0]?.value;
    if (!vaultId) {
      throw new NotFound("Unable to retrieve the vault context.")
    }
    return vaultId;
  };

  private async getVaultIdForMembership(membershipId: string): Promise<string> {
    const items = await this.client.paginatedQuery(membershipVaultIdQuery,
      { id: membershipId });
    const vaultId = items?.[0]?.tags.filter((tag: Tag) => tag.name === "Vault-Id")[0]?.value;
    if (!vaultId) {
      throw new NotFound("Unable to retrieve the vault context.")
    }
    return vaultId;
  };

  private getCurrentMember(memberships?: Array<Membership>): Membership {
    if (!this.config?.address) {
      throw new BadRequest("Missing wallet address in api configuration.");
    }
    const membership = (memberships ? memberships : [])
      .filter(membership => membership.address === this.config.address)[0];
    if (!membership) {
      throw new Forbidden("User is not a valid vault member.");
    }
    return membership;
  }

  private withVaultContext(object: any, vault: Vault): any {
    const vaultContext = { __public__: vault.public, __cacheOnly__: false };
    let encryptionContext: { __keys__?: EncryptedKeys[], __publicKey__?: null } = {};
    if (!vault.public) {
      const membership = this.getCurrentMember(vault.memberships);
      encryptionContext.__keys__ = membership.keys;
    }
    return {
      ...object,
      ...vaultContext,
      ...encryptionContext
    }
  }
}

export type VaultGetOptions =
  VaultApiGetOptions &
  {
    withMemberships?: boolean,
    withFolders?: boolean,
    withStacks?: boolean,
    withMemos?: boolean
  }

export {
  ExplorerApi
}
