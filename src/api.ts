import { Api } from "@akord/akord-js/lib/api/api";
import { ContractState, Tag, Tags } from "@akord/akord-js/lib/types/contract";
import { NodeLike, NodeType, Vault, Membership, MembershipKeys, Transaction } from "@akord/akord-js";
import { Paginated } from "@akord/akord-js/lib/types/paginated";
import { ListOptions, VaultApiGetOptions } from "@akord/akord-js/lib/types/query-options";
import { getTxData, getTxMetadata } from "@akord/akord-js/lib/arweave";
import { membershipVaultIdQuery, membershipsQuery, nodeVaultIdQuery, nodesByTagsAndTypeQuery, nodesByTypeQuery, nodesQuery, timelineQuery, vaultsByTagsQuery, vaultsQuery } from "./graphql/queries";
import { ApiClient, TxNode } from "./graphql/client";
import { WarpFactory, LoggerFactory, DEFAULT_LEVEL_DB_LOCATION, Contract } from "warp-contracts";
import { EncryptionMetadata } from "@akord/akord-js/lib/core";
import { NotFound } from "@akord/akord-js/lib/errors/not-found";
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
    const node = this.findById(id, vault.nodes);
    return this.downloadObject(node, vault);
  };

  public async getMembership(id: string, vaultId?: string): Promise<Membership> {
    if (!vaultId) {
      vaultId = await this.getVaultIdForMembership(id);
    }
    const vault = await this.getVault(vaultId);
    const membership = this.findById(id, vault.memberships) as Membership;
    return membership;
  };

  public async getVault(id: string, options?: VaultGetOptions): Promise<Vault> {
    const contract = getContract(id);
    let vault = (await contract.readState()).cachedValue.state;
    vault = await this.downloadObject(vault);
    if (!vault.public || options?.deep || options?.withMemberships) {
      await this.downloadMemberships(vault);
    }
    if (options?.withStacks) {
      await this.downloadNodes(vault, "Stack");
    }
    if (options?.withFolders) {
      await this.downloadNodes(vault, "Folder");
    }
    if (options?.withMemos) {
      await this.downloadNodes(vault, "Memo");
    }
    if (options?.deep || options?.withNodes) {
      await this.downloadNodes(vault);
    }
    if (!vault.public) {
      const membership = this.getCurrentMember(vault.memberships);
      vault.__keys__ = membership?.keys;
    }
    return vault;
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
        const vaultId = this.getTagValue(item.tags, "Contract");
        const membershipId = this.getTagValue(item.tags, "Membership-Id");
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
        const vaultId = this.getTagValue(item.tags, "Contract");
        const vault = await this.getVault(vaultId, { withMemberships: true });
        if (!vault.public) {
          const membership = this.getCurrentMember(vault.memberships);
          vault.keys = membership?.keys;
        }
        return vault;
      })) as Array<any>;
    return { items: vaults, nextToken: nextPage };
  };

  public async getNodesByVaultId<T>(vaultId: string, type: NodeType, options: ListOptions): Promise<Paginated<T>> {
    const vault = await this.getVault(vaultId, { ["with" + type + "s"]: true, withMemberships: true });
    return {
      items: vault[type.toLowerCase() + "s"] as Array<T>,
      nextToken: "null"
    };
  };

  public async getMembershipsByVaultId(vaultId: string, options: ListOptions): Promise<Paginated<Membership>> {
    const vault = await this.getVault(vaultId, { withMemberships: true });
    return {
      items: vault.memberships as Array<Membership>,
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

  public async listAllVaults(options: ExplorerListOptions = {}): Promise<Array<Vault>> {
    let items: Array<TxNode>;
    if (options.tags) {
      items = await this.client.paginatedQuery(vaultsByTagsQuery, { tags: this.processTags(options.tags.values) });
    } else {
      items = await this.client.paginatedQuery(vaultsQuery, {});
    }
    const vaults = await Promise.all(items
      .map(async (item: TxNode) => {
        const vaultId = this.getTagValue(item.tags, "Contract");
        const vault = await this.getVault(vaultId);
        return vault;
      })) as Array<Vault>;
    return this.filterByDates<Vault>(options, this.filterByTags<Vault>(options.tags, vaults));
  };

  public async listAllNodes<T>(type: NodeType, options: ExplorerListOptions = {}): Promise<Array<T>> {
    let items: Array<TxNode>;
    if (options.tags) {
      items = await this.client.paginatedQuery(nodesByTagsAndTypeQuery, { objectType: type, tags: this.processTags(options.tags.values) });
    } else {
      items = await this.client.paginatedQuery(nodesByTypeQuery, { objectType: type });
    }
    const nodes = await Promise.all(items
      .map(async (item: TxNode) => {
        const vaultId = this.getTagValue(item.tags, "Contract");
        const nodeId = this.getTagValue(item.tags, "Node-Id");
        const node = await this.getNode<T>(nodeId, type, vaultId);
        return node;
      })) as Array<T>;
    return this.filterByDates<T>(options, this.filterByTags<T>(options.tags, nodes));
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

  private getDataTx(object: Object) {
    return object.data?.[object.data.length - 1];
  };

  private findById(id: string, objects?: Array<NodeLike | Membership>) {
    const object = (objects ? objects : []).find(object => object.id === id);
    if (!object) {
      throw new NotFound("Cannot find vault object with id: " + id);
    }
    return object;
  };

  private processTags(tags: string[]): string[] {
    const processedTags = [] as string[];
    tags?.map((tag: string) =>
      tag.split(" ").map((value: string) => processedTags.push(value.toLowerCase())));
    return processedTags;
  };

  private filterByTags<T>(tags: ListOptions["tags"], objects: Array<T>): Array<T> {
    if (tags) {
      const processedTags = this.processTags(tags.values as string[]);
      const filteredArray = (<Array<NodeLike | Vault>>objects).filter((object: NodeLike | Vault) =>
        tags.searchCriteria === "CONTAINS_SOME"
          ? processedTags.some((tag: string) => this.processTags([object.name].concat(object.tags)).includes(tag))
          : processedTags.every((tag: string) => this.processTags([object.name].concat(object.tags)).includes(tag))
      );
      // remove duplicates
      return [...new Map(filteredArray.map(item => [item.id, item])).values()] as Array<T>;
    } else {
      return objects;
    }
  };

  private filterByDates<T>(options: ExplorerListOptions, objects: Array<T>): Array<T> {
    const r = (<Array<NodeLike | Vault>>objects).filter((object: NodeLike | Vault) => {
      return (!options.minCreatedAt || <any>object.createdAt >= options.minCreatedAt)
        && (!options.maxCreatedAt || <any>object.createdAt <= options.maxCreatedAt)
        && (!options.minUpdatedAt || <any>object.updatedAt >= options.minUpdatedAt)
        && (!options.maxUpdatedAt || <any>object.updatedAt <= options.maxUpdatedAt)
    }) as Array<T>;
    return r;
  };

  private getTagValue(tags: Tags, name: string): string {
    const tagValue = tags.find((tag: Tag) => tag.name === name)?.value;
    if (!tagValue) {
      throw new NotFound("Cannot find tag value for: " + name);
    }
    return tagValue;
  }

  private async downloadObject(object: Object, vault?: Vault) {
    const dataTx = this.getDataTx(object);
    const state = await this.getNodeState(dataTx);
    if (!vault) {
      return formatDates({ ...object, ...state });
    } else {
      const formatted = formatDates({ ...object, ...state, vaultId: vault.id });
      return this.withVaultContext(formatted, vault);
    }
  };

  private async downloadMemberships(vault: Vault) {
    vault.memberships = await Promise.all((vault.memberships ? vault.memberships : [])
      .map(async (membership: Membership) => {
        const membershipObject = await this.downloadObject(membership, vault);
        return membershipObject;
      }));
  };

  private async downloadNodes(vault: Vault, type?: NodeType) {
    vault.folders = [];
    vault.stacks = [];
    vault.memos = [];
    vault.nodes = await Promise.all((vault.nodes ? vault.nodes : [])
      .map(async (node: NodeLike) => {
        if (!type || (node.type === type)) {
          const nodeObject = await this.downloadObject(node, vault);
          vault[node.type.toLowerCase() + "s"].push(nodeObject);
          return nodeObject;
        }
        return node;
      }));
  };

  private async getVaultIdForNode(nodeId: string): Promise<string> {
    const items = await this.client.paginatedQuery(nodeVaultIdQuery,
      { id: nodeId });
    const vaultId = this.getTagValue(items?.[0]?.tags, "Vault-Id");
    return vaultId;
  };

  private async getVaultIdForMembership(membershipId: string): Promise<string> {
    const items = await this.client.paginatedQuery(membershipVaultIdQuery,
      { id: membershipId });
    const vaultId = this.getTagValue(items?.[0]?.tags, "Vault-Id");
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

  private withVaultContext(object: Membership | NodeLike, vault: Vault): any {
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

const formatDates = (state: any) => {
  if (state.createdAt) {
    state.createdAt = getDateFromTimestamp(state.createdAt);
  }
  if (state.updatedAt) {
    state.updatedAt = getDateFromTimestamp(state.updatedAt);
  }
  if (state.versions && state.versions.length) {
    state.versions = state.versions.map((version: any) => {
      if (version.createdAt) {
        version.createdAt = getDateFromTimestamp(version.createdAt);
      }
      if (version.updatedAt) {
        version.updatedAt = getDateFromTimestamp(version.updatedAt);
      }
      if (version.reactions) {
        version.reactions = version.reactions.map((reaction: any) => {
          if (version.createdAt) {
            reaction.createdAt = getDateFromTimestamp(reaction.createdAt);
          }
          return reaction;
        })
      }
      return version;
    })
  }
  return state;
}


const getDateFromTimestamp = (timestamp: string): Date => {
  return new Date(JSON.parse(timestamp));
};

export type Object = Vault | Membership | NodeLike;

export type VaultGetOptions =
  VaultApiGetOptions &
  {
    withMemberships?: boolean,
    withFolders?: boolean,
    withStacks?: boolean,
    withMemos?: boolean
  }

export type ExplorerListOptions =
  ListOptions &
  {
    minCreatedAt?: Date,
    maxCreatedAt?: Date,
    minUpdatedAt?: Date,
    maxUpdatedAt?: Date
  }


export {
  ExplorerApi
}
