import { Api } from "@akord/akord-js/lib/api/api";
import { ContractState, Tag, Tags } from "@akord/akord-js/lib/types/contract";
import { NodeLike, NodeType, Vault, Membership, MembershipKeys, Transaction, Stack, Folder, Memo, Node } from "@akord/akord-js";
import { Paginated } from "@akord/akord-js/lib/types/paginated";
import { ListOptions, VaultApiGetOptions } from "@akord/akord-js/lib/types/query-options";
import { getTxData, getTxMetadata } from "@akord/akord-js/lib/arweave";
import * as queries from "./graphql/queries";
import * as legacyQueries from "./graphql/legacy/queries";
import { ApiClient, TxNode } from "./graphql/client";
import { EncryptionMetadata } from "@akord/akord-js/lib/core";
import { NotFound } from "@akord/akord-js/lib/errors/not-found";
import { Forbidden } from "@akord/akord-js/lib/errors/forbidden";
import { BadRequest } from "@akord/akord-js/lib/errors/bad-request";
import { EncryptedKeys } from "@akord/crypto";
import { ApiConfig, defaultApiConfig, initConfig } from "./config";
import { Logger } from "./logger";
import { status, functions, protocolTags, smartweaveTags } from "@akord/akord-js/lib/constants";

const DEFAULT_LIMIT = 100, MAX_LIMIT = 100;

const getLimit = (limit?: number): number => {
  if (limit && limit <= MAX_LIMIT) {
    return limit;
  } else {
    return DEFAULT_LIMIT;
  }
};

type VaultContext = {
  __public__: boolean,
  __cacheOnly__: boolean,
  __keys__: EncryptedKeys[],
  __publicKey__: string
};

const DEFAULT_VAULT_CONTEXT = {
  __public__: true,
  __cacheOnly__: false,
  __keys__: [],
  __publicKey__: null as any
};

const VAULT_DATA_FUNCTIONS = [
  functions.VAULT_CREATE,
  functions.VAULT_UPDATE
] as string[];

const VAULT_STATUS_FUNCTIONS = [
  functions.VAULT_CREATE,
  functions.VAULT_ARCHIVE,
  functions.VAULT_RESTORE
] as string[];

const NODE_DATA_FUNCTIONS = [
  functions.NODE_CREATE,
  functions.NODE_UPDATE
] as string[];

const NODE_PARENT_ID_FUNCTIONS = [
  functions.NODE_CREATE,
  functions.NODE_MOVE
] as string[];

const NODE_STATUS_FUNCTIONS = [
  functions.NODE_CREATE,
  functions.NODE_REVOKE,
  functions.NODE_RESTORE
] as string[];

const MEMBERSHIP_CREATION_FUNCTIONS = [
  functions.VAULT_CREATE,
  functions.MEMBERSHIP_INVITE,
  functions.MEMBERSHIP_ADD
] as string[];

const MEMBERSHIP_DATA_FUNCTIONS = [
  functions.VAULT_CREATE,
  functions.MEMBERSHIP_INVITE,
  functions.MEMBERSHIP_UPDATE,
  functions.MEMBERSHIP_ADD,
] as string[];

const MEMBERSHIP_STATUS_FUNCTIONS = [
  functions.VAULT_CREATE,
  functions.MEMBERSHIP_INVITE,
  functions.MEMBERSHIP_ADD,
  functions.MEMBERSHIP_ACCEPT,
  functions.MEMBERSHIP_REVOKE,
] as string[];

const nodeLikeFactory = (nodeProto: any, type: NodeType, vaultContext: VaultContext): NodeLike => {
  // TODO: use a generic NodeLike constructor
  nodeProto.__public__ = vaultContext.__public__;
  if (type === "Folder") {
    return new Folder(nodeProto, vaultContext.__keys__);
  } else if (type === "Stack") {
    return new Stack(nodeProto, vaultContext.__keys__);
  } else if (type === "Memo") {
    return new Memo(nodeProto, vaultContext.__keys__);
  } else {
    throw new BadRequest("Given type is not supported: " + type);
  }
}

export default class ExplorerApi extends Api {

  config: ApiConfig;
  client: ApiClient;

  constructor(config: ApiConfig = defaultApiConfig) {
    super();
    this.config = initConfig(config);
    Logger.debug = this.config.debug ? this.config.debug : false;
    this.client = new ApiClient(this.config);
  }

  public async getNode<T>(id: string, type: NodeType): Promise<T> {
    const nodeProto = await this.getNodeProto(id);
    return nodeLikeFactory(formatDates(nodeProto), type, await this.getVaultContext(nodeProto.vaultId)) as T;
  };

  public async getMembership(id: string): Promise<Membership> {
    const membershipProto = await this.getMembershipProto(id);
    const vaultContext = await this.getVaultContext(membershipProto.vaultId);
    membershipProto.__public__ = vaultContext.__public__;
    return new Membership(formatDates(membershipProto), vaultContext.__keys__);
  };

  public async getVault(id: string, options?: VaultGetOptions): Promise<Vault> {
    const vaultProto = await this.getVaultProto(id);
    let keys: EncryptedKeys[] = [];
    if (!vaultProto.public) {
      const membership = await this.getCurrentMembership(id);
      keys = membership?.keys;
    }
    return new Vault(formatDates(vaultProto), keys);
  };

  public async getMembershipKeys(vaultId: string): Promise<MembershipKeys> {
    const vaultCreationTx = await this.transactionByObjectIdQuery(vaultId, "vaultCreationQuery");
    const isPublic = this.getTagValue(vaultCreationTx.tags, "Public") === "true" ? true : false;
    if (!isPublic) {
      const membership = await this.getCurrentMembership(vaultId);
      return { isEncrypted: true, keys: membership.keys };
    } else {
      return { isEncrypted: false, keys: [] };
    }
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
    const { items, nextToken: nextPage } = await this.client.executeQuery(queries.membershipsByAddressQuery,
      { address: this.config.address, nextToken: options.nextToken, limit: getLimit(options.limit) });
    const memberships = await Promise.all(items
      .map(async (item: TxNode) => {
        const membershipId = this.getTagValue(item.tags, protocolTags.MEMBERSHIP_ID);
        const membership = await this.getMembership(membershipId);
        return membership;
      })) as Array<Membership>;
    return { items: memberships, nextToken: nextPage };
  };

  public async getVaults(options: ListOptions = {}): Promise<Paginated<Vault>> {
    if (!this.config?.address) {
      throw new BadRequest("Missing wallet address in api configuration.");
    }
    const { items, nextToken: nextPage } = await this.client.executeQuery(queries.membershipsByAddressQuery,
      { address: this.config.address, nextToken: options.nextToken, limit: getLimit(options.limit) });
    const vaults = await Promise.all(items
      .map(async (item: TxNode) => {
        const vaultId = this.getTagValue(item.tags, "Contract");
        try {
          const vault = await this.getVault(vaultId);
          vault.keys = vault.__keys__;
          return vault;
        } catch (error) {
          if (error instanceof Forbidden) {
            // user is no longer a valid vault member
            return null;
          }
          throw error;
        }
      })) as Array<Vault>;
    return { items: this.filterByStatus(options.filter, vaults.filter((vault: Vault) => vault !== null)), nextToken: nextPage };
  };

  public async getNodesByVaultId<T>(vaultId: string, type: NodeType, options: ListOptions): Promise<Paginated<T>> {
    let items: TxNode[], nextToken: string;
    if (options.parentId && options.parentId !== "null") {
      const result = await this.client.executeQuery(queries.nodesByParentIdAndTypeQuery,
        { parentId: options.parentId, vaultId, type, nextToken: options.nextToken, limit: getLimit(options.limit) });
      items = result.items;
      nextToken = result.nextToken;
    } else {
      const result = await this.client.executeQuery(queries.nodesByVaultIdAndTypeQuery,
        { vaultId, type, nextToken: options.nextToken, limit: getLimit(options.limit) });
      items = result.items;
      nextToken = result.nextToken;
    }
    const vaultContext = await this.getVaultContext(vaultId);
    const nodes = await Promise.all(items
      .map(async (item: TxNode) => {
        const nodeId = this.getTagValue(item.tags, protocolTags.NODE_ID);
        const node = await this.getNodeProto(nodeId);
        return nodeLikeFactory(formatDates(node), type, vaultContext) as T;
      })) as Array<T>;
    return { items: this.filterByStatus(options.filter, nodes), nextToken };
  };

  public async getMembershipsByVaultId(vaultId: string, options: ListOptions): Promise<Paginated<Membership>> {
    const { items, nextToken: nextPage } = await this.client.executeQuery(queries.membershipsByVaultIdQuery,
      { vaultId, nextToken: options.nextToken, limit: getLimit(options.limit) });
    const vaultContext = await this.getVaultContext(vaultId);
    const memberships = await Promise.all(items
      .map(async (item: TxNode) => {
        const membershipId = this.getTagValue(item.tags, protocolTags.MEMBERSHIP_ID);
        const membershipProto = await this.getMembershipProto(membershipId);
        membershipProto.__public__ = vaultContext.__public__;
        return new Membership(formatDates(membershipProto), vaultContext.__keys__);
      })) as Array<Membership>;
    return { items: this.filterByStatus(options.filter, memberships), nextToken: nextPage };
  };

  public async getTransactions(vaultId: string): Promise<Array<Transaction>> {
    return await <any>this.client.paginatedQuery(queries.timelineQuery, { vaultId });
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

  public async listPublicVaults(options: ExplorerListOptions = {}): Promise<Paginated<Vault>> {
    let items: Array<TxNode>;
    let nextToken = "null";
    if (options.tags) {
      const queryResult = await this.client.executeQuery(queries.vaultsByTagsQuery, { tags: this.processTags(options.tags.values), nextToken: options.nextToken });
      items = queryResult.items;
      nextToken = queryResult.nextToken;
    } else {
      const queryResult = await this.client.executeQuery(queries.listPublicVaultsQuery, { nextToken: options.nextToken });
      items = queryResult.items;
      nextToken = queryResult.nextToken;
    }
    const vaults = await Promise.all(items
      .map(async (item: TxNode) => {
        const vaultId = this.getTagValue(item.tags, "Contract");
        const vault = await this.getVault(vaultId);
        return new Vault(vault, []);
      })) as Array<Vault>;
    return { items: this.filterByDates<Vault>(options, this.filterByTags<Vault>(options.tags, vaults.filter((vault: Vault) => vault.status === status.ACTIVE))), nextToken };
  };

  public async listAllPublicVaults(options: ExplorerListOptions = {}): Promise<Array<Vault>> {
    let nextToken = undefined;
    let results: Vault[] = [];
    do {
      const { items, nextToken: nextPage } = await this.listPublicVaults(options);
      results = results.concat(items);
      if (nextPage === "null") {
        nextToken = undefined;
      }
      options.nextToken = nextPage;
      nextToken = nextPage;
    } while (nextToken);
    return results;
  };
  public async listPublicNodes<T extends Node>(type: NodeType, options: ExplorerListOptions = {}): Promise<Paginated<T>> {
    let items: Array<TxNode>;
    let nextToken = "null";
    if (options.tags) {
      const queryResult = await this.client.executeQuery(queries.nodesByTagsAndTypeQuery, { type, tags: this.processTags(options.tags.values), nextToken: options.nextToken });
      items = queryResult.items;
      nextToken = queryResult.nextToken;
    } else {
      const queryResult = await this.client.executeQuery(queries.listPublicNodesByTypeQuery, { type, nextToken: options.nextToken });
      items = queryResult.items;
      nextToken = queryResult.nextToken;
    }
    const nodes = await Promise.all(items
      .map(async (item: TxNode) => {
        const nodeId = this.getTagValue(item.tags, protocolTags.NODE_ID);
        const node = await this.getNodeProto(nodeId);
        return nodeLikeFactory(node, type, DEFAULT_VAULT_CONTEXT) as unknown as T;
      })) as Array<T>;
    return { items: this.filterByDates<T>(options, this.filterByTags<T>(options.tags, nodes.filter((node: T) => node.status === status.ACTIVE))), nextToken };
  };

  public async listAllPublicNodes<T extends Node>(type: NodeType, options: ExplorerListOptions = {}): Promise<Array<T>> {
    let nextToken = undefined;
    let results: T[] = [];
    do {
      const { items, nextToken: nextPage } = await this.listPublicNodes<T>(type, options);
      results = results.concat(items);
      if (nextPage === "null") {
        nextToken = undefined;
      }
      options.nextToken = nextPage;
      nextToken = nextPage;
    } while (nextToken);
    return results;
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

  private async getVaultProto(id: string): Promise<Vault> {
    const txs = await this.transactionsByObjectIdQuery(id, "transactionsByVaultIdQuery");

    const vaultCreationTx =
      txs.find((edge: TxNode) => this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME) === functions.VAULT_CREATE)
      || await this.transactionByObjectIdQuery(id, "vaultCreationQuery");

    const vaultLastUpdateTx = txs[0];

    const vaultLastDataTx =
      txs.find((edge: TxNode) => VAULT_DATA_FUNCTIONS.includes(this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME)))
      || await this.transactionByObjectIdQuery(id, "vaultDataQuery");

    const vaultStatusTx =
      txs.find((edge: TxNode) => VAULT_STATUS_FUNCTIONS.includes(this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME)))
      || await this.transactionByObjectIdQuery(id, "vaultStatusQuery");

    const statusFunctionName = this.getTagValue(vaultStatusTx.tags, protocolTags.FUNCTION_NAME);
    const vaultStatus = (statusFunctionName === functions.VAULT_CREATE || statusFunctionName === functions.VAULT_RESTORE)
      ? status.ACTIVE
      : status.ARCHIVED;

    const input = this.getTagValue(vaultLastDataTx.tags, smartweaveTags.INPUT);
    const functionName = this.getTagValue(vaultLastDataTx.tags, protocolTags.FUNCTION_NAME);
    const dataTx = functionName === functions.VAULT_CREATE ? JSON.parse(input).data.vault : JSON.parse(input).data;
    const state = await this.getNodeState(dataTx);

    const isPublic = this.getTagValue(vaultCreationTx.tags, protocolTags.PUBLIC) === "true" ? true : false;

    const vaultProto = {
      id: this.getTagValue(vaultCreationTx.tags, smartweaveTags.CONTRACT),
      owner: this.getTagValue(vaultCreationTx.tags, protocolTags.SIGNER_ADDRESS),
      createdAt: this.getTagValue(vaultCreationTx.tags, protocolTags.TIMESTAMP),
      updatedAt: this.getTagValue(vaultLastUpdateTx.tags, protocolTags.TIMESTAMP),
      public: isPublic,
      status: vaultStatus,
      ...state
    } as Vault;
    return vaultProto;
  };

  private async getNodeProto(id: string): Promise<NodeLike> {
    const txs = await this.transactionsByObjectIdQuery(id, "transactionsByNodeIdQuery");

    const nodeCreationTx = txs.find((edge: TxNode) =>
      this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME) === functions.NODE_CREATE)
      || await this.transactionByObjectIdQuery(id, "nodeCreationQuery");
    const nodeLastUpdateTx = txs[0];
    const nodeLastDataTx =
      txs.find((edge: TxNode) => NODE_DATA_FUNCTIONS.includes(this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME)))
      || await this.transactionByObjectIdQuery(id, "nodeDataQuery");
    const nodeStatusTx =
      txs.find((edge: TxNode) => NODE_STATUS_FUNCTIONS.includes(this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME)))
      || await this.transactionByObjectIdQuery(id, "nodeStatusQuery");

    const nodeParentIdTx =
      txs.find((edge: TxNode) => NODE_PARENT_ID_FUNCTIONS.includes(this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME)))
      || await this.transactionByObjectIdQuery(id, "nodeParentIdQuery");

    const input = this.getTagValue(nodeLastDataTx.tags, smartweaveTags.INPUT);
    const vaultId = this.getTagValue(nodeCreationTx.tags, protocolTags.VAULT_ID);
    const dataTx = JSON.parse(input).data;
    const state = await this.getNodeState(dataTx);

    const statusFunctionName = this.getTagValue(nodeStatusTx.tags, protocolTags.FUNCTION_NAME);
    const nodeStatus = (statusFunctionName === functions.NODE_CREATE || statusFunctionName === functions.NODE_RESTORE)
      ? status.ACTIVE
      : status.REVOKED;

    const parentId = JSON.parse(this.getTagValue(nodeParentIdTx.tags, smartweaveTags.INPUT)).parentId;

    const nodeProto = {
      id: id,
      vaultId: vaultId,
      owner: this.getTagValue(nodeCreationTx.tags, protocolTags.SIGNER_ADDRESS),
      createdAt: this.getTagValue(nodeCreationTx.tags, protocolTags.TIMESTAMP),
      updatedAt: this.getTagValue(nodeLastUpdateTx.tags, protocolTags.TIMESTAMP),
      status: nodeStatus,
      parentId: parentId ? parentId : null,
      ...state
    } as NodeLike;
    return nodeProto;
  };

  private async getMembershipProto(id: string): Promise<Membership> {
    const txs = await this.transactionsByObjectIdQuery(id, "transactionsByMembershipIdQuery");

    const membershipCreationTx =
      txs.find((edge: TxNode) => MEMBERSHIP_CREATION_FUNCTIONS.includes(this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME)))
      || await this.transactionByObjectIdQuery(id, "membershipCreationQuery");

    const membershipLastUpdateTx = txs[0];

    const membershipLastDataTx =
      txs.find((edge: TxNode) => MEMBERSHIP_DATA_FUNCTIONS.includes(this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME)))
      || await this.transactionByObjectIdQuery(id, "membershipDataQuery");

    const membershipStatusTx =
      txs.find((edge: TxNode) => MEMBERSHIP_STATUS_FUNCTIONS.includes(this.getTagValue(edge.tags, protocolTags.FUNCTION_NAME)))
      || await this.transactionByObjectIdQuery(id, "membershipStatusQuery");

    const vaultId = this.getTagValue(membershipCreationTx.tags, protocolTags.VAULT_ID);
    const input = this.getTagValue(membershipLastDataTx.tags, smartweaveTags.INPUT);
    const dataTx = this.getTagValue(membershipLastDataTx.tags, protocolTags.FUNCTION_NAME) === functions.VAULT_CREATE
      ? JSON.parse(input).data.membership
      : JSON.parse(input).data;
    const state = await this.getNodeState(dataTx);

    const functionName = this.getTagValue(membershipStatusTx.tags, protocolTags.FUNCTION_NAME);
    const membershipStatus = functionName === functions.MEMBERSHIP_INVITE
      ? status.PENDING
      : (functionName === functions.MEMBERSHIP_ACCEPT || functionName === functions.MEMBERSHIP_ADD)
        ? status.ACCEPTED
        : status.REVOKED

    const membershipProto = {
      id: id,
      vaultId: vaultId,
      owner: this.getTagValue(membershipCreationTx.tags, protocolTags.SIGNER_ADDRESS),
      createdAt: this.getTagValue(membershipCreationTx.tags, protocolTags.TIMESTAMP),
      updatedAt: this.getTagValue(membershipLastUpdateTx.tags, protocolTags.TIMESTAMP),
      status: membershipStatus,
      ...state
    } as Membership;
    return membershipProto;
  };

  private processTags(tags: string[]): string[] {
    const processedTags = [] as string[];
    tags?.map((tag: string) =>
      tag.split(" ").map((value: string) => processedTags.push(value.toLowerCase())));
    return processedTags;
  };

  private async transactionByObjectIdQuery(id: string, queryName: string): Promise<TxNode> {
    const { items } = await this.client.executeQuery((queries as any)[queryName], { id });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery((legacyQueries as any)[queryName], { id });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find corresponding transaction: " + queryName + " for object with id: " + id);
      }
    }
    return item;
  }

  private async transactionsByObjectIdQuery(id: string, queryName: string): Promise<TxNode[]> {
    const { items } = await this.client.executeQuery((queries as any)[queryName], { id });
    let txs = items;
    if (!txs || txs.length === 0) {
      const { items } = await this.client.executeQuery((legacyQueries as any)[queryName], { id });
      txs = items;
    }
    return txs;
  }

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

  private filterByStatus<T>(filter: ListOptions["filter"], objects: Array<T>): Array<T> {
    const validStatus = [] as Array<string>;
    if (filter) {
      if ((<any>filter).status?.eq) {
        validStatus.push((<any>filter).status?.eq);
      }
      if ((<any>filter).or) {
        (<any>filter).or.map((pred: any) => {
          if (pred.status?.eq) {
            validStatus.push(pred.status?.eq);
          }
        })
      }
      if (validStatus.length === 0 || validStatus.includes(status.ACCEPTED)) {
        validStatus.push(status.ACTIVE);
      }
      return (<Array<NodeLike | Vault>>objects).filter((object: NodeLike | Vault) =>
        validStatus.includes(object.status)
      ) as Array<T>;
    } else {
      return objects;
    }
  };

  private getTagValue(tags: Tags, name: string): string {
    let tagValue = tags.find((tag: Tag) => tag.name === name)?.value;
    if (!tagValue) {
      if (name === protocolTags.FUNCTION_NAME) {
        tagValue = tags.find((tag: Tag) => tag.name === "Command")?.value;
      }
      if (!tagValue) {
        throw new NotFound("Cannot find tag value for: " + name);
      }
    }
    return tagValue;
  }

  private async getCurrentMembership(vaultId: string): Promise<Membership> {
    if (!this.config?.address) {
      throw new BadRequest("Missing wallet address in api configuration.");
    }

    const { items } = await this.client.executeQuery(queries.membershipByAddressAndVaultIdQuery,
      { address: this.config.address, vaultId });
    const membershipId = this.getTagValue(items?.[0]?.tags, protocolTags.MEMBERSHIP_ID);
    const membershipProto = await this.getMembershipProto(membershipId);
    return new Membership(membershipProto, membershipProto.keys);
  }

  private async getVaultContext(vaultId: string): Promise<VaultContext> {
    const vaultCreationTx = await this.transactionByObjectIdQuery(vaultId, "vaultCreationQuery");
    const isPublic = this.getTagValue(vaultCreationTx.tags, protocolTags.PUBLIC) === "true" ? true : false;
    const vaultContext = {
      __public__: isPublic,
      __cacheOnly__: false
    };
    const encryptionContext = {
      __keys__: [] as EncryptedKeys[],
      __publicKey__: null as any
    };
    if (!isPublic) {
      const membership = await this.getCurrentMembership(vaultId);
      encryptionContext.__keys__ = membership.keys;
    }
    return {
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
