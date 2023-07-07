import { Api } from "@akord/akord-js/lib/api/api";
import { ContractState, Tag, Tags } from "@akord/akord-js/lib/types/contract";
import { NodeLike, NodeType, Vault, Membership, MembershipKeys, Transaction, Stack, Folder, Memo, Node, StatusType, NodeFactory } from "@akord/akord-js";
import { Paginated } from "@akord/akord-js/lib/types/paginated";
import { ListOptions, VaultApiGetOptions } from "@akord/akord-js/lib/types/query-options";
import { getTxData, getTxMetadata } from "@akord/akord-js/lib/arweave";
import { membershipDataQuery, membershipStatusQuery, nodeDataQuery, nodeStatusQuery, nodesByTagsAndTypeQuery, nodesByVaultIdAndTypeQuery, transactionsByVaultIdQuery, vaultDataQuery, vaultCreationQuery, vaultStatusQuery, vaultsByTagsQuery, vaultLastUpdateQuery, membershipByAddressAndVaultIdQuery, membershipsByVaultIdQuery, membershipsByAddressQuery, listPublicVaultsQuery, listPublicNodesByTypeQuery, nodeCreationQuery, nodeLastUpdateQuery, membershipLastUpdateQuery, nodeParentIdQuery, membershipCreationQuery } from "./graphql/queries";
import * as legacyQueries from "./graphql/legacy/queries";
import { ApiClient, TxNode } from "./graphql/client";
import { EncryptionMetadata } from "@akord/akord-js/lib/core";
import { NotFound } from "@akord/akord-js/lib/errors/not-found";
import { Forbidden } from "@akord/akord-js/lib/errors/forbidden";
import { BadRequest } from "@akord/akord-js/lib/errors/bad-request";
import { EncryptedKeys } from "@akord/crypto";
import { ApiConfig, defaultApiConfig, initConfig } from "./config";
import { Logger } from "./logger";
import { status } from "@akord/akord-js/lib/constants";

const DEFAULT_LIMIT = 100, MAX_LIMIT = 100;

const getLimit = (limit?: number): number => {
  if (limit && limit <= MAX_LIMIT) {
    return limit;
  } else {
    return DEFAULT_LIMIT;
  }
};

const nodeLikeFactory = (nodeProto: any, type: NodeType, keys: EncryptedKeys[]): NodeLike => {
  // TODO: use a generic NodeLike constructor
  if (type === "Folder") {
    return new Folder(nodeProto, keys);
  } else if (type === "Stack") {
    return new Stack(nodeProto, keys);
  } else if (type === "Memo") {
    return new Memo(nodeProto, keys);
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
    const { items } = await this.client.executeQuery(nodeDataQuery, { nodeId: id });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.nodeDataQuery, { nodeId: id });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find node with id: " + id);
      }
    }
    const input = this.getTagValue(item.tags, "Input");
    const vaultId = this.getTagValue(item.tags, "Vault-Id");
    const dataTx = JSON.parse(input).data;
    const state = await this.getNodeState(dataTx);

    const { createdAt } = await this.nodeCreationData(id);
    const { updatedAt } = await this.nodeLastUpdateData(id);

    const nodeProto = await this.withVaultContext(formatDates({
      id: id,
      vaultId: vaultId,
      owner: this.getTagValue(item.tags, "Signer-Address"),
      createdAt: createdAt,
      updatedAt: updatedAt,
      status: await this.getNodeStatus(id),
      parentId: await this.getNodeParentId(id),
      ...state
    }), vaultId) as NodeLike;
    const keys = nodeProto.__keys__ || [];
    return nodeLikeFactory(nodeProto, type, keys) as T;
  };

  public async getMembership(id: string): Promise<Membership> {
    const { items } = await this.client.executeQuery(membershipDataQuery, { membershipId: id });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.membershipDataQuery, { membershipId: id });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find membership with id: " + id);
      }
    }
    const input = this.getTagValue(item.tags, "Input");
    const vaultId = this.getTagValue(item.tags, "Vault-Id");
    const functionName = this.getTagValue(item.tags, "Function-Name");
    const dataTx = functionName === "vault:init" ? JSON.parse(input).data.membership : JSON.parse(input).data;
    const state = await this.getNodeState(dataTx);

    const { createdAt } = await this.membershipCreationData(id);
    const { updatedAt } = await this.membershipLastUpdateData(id);

    const membershipProto = await this.withVaultContext(formatDates({
      id: id,
      vaultId: vaultId,
      owner: this.getTagValue(item.tags, "Signer-Address"),
      createdAt: createdAt,
      updatedAt: updatedAt,
      status: await this.getMembershipStatus(id),
      ...state
    }), vaultId) as Membership;
    const keys = membershipProto.__keys__ || [];
    return new Membership(membershipProto, keys);
  };

  public async getVault(id: string, options?: VaultGetOptions): Promise<Vault> {
    const { items } = await this.client.executeQuery(vaultDataQuery, { vaultId: id });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.vaultDataQuery, { vaultId: id });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find vault with id: " + id);
      }
    }
    const input = this.getTagValue(item.tags, "Input");
    const functionName = this.getTagValue(item.tags, "Function-Name");
    const dataTx = functionName === "vault:init" ? JSON.parse(input).data.vault : JSON.parse(input).data;
    const state = await this.getNodeState(dataTx);

    const { public: isPublic, createdAt } = await this.vaultCreationData(id);
    const { updatedAt } = await this.vaultLastUpdateData(id);

    const vaultProto = formatDates({
      id: this.getTagValue(item.tags, "Contract"),
      owner: this.getTagValue(item.tags, "Signer-Address"),
      createdAt: createdAt,
      updatedAt: updatedAt,
      public: isPublic,
      status: await this.getVaultStatus(id),
      ...state
    }) as Vault;
    let keys: EncryptedKeys[] = [];
    if (!vaultProto.public) {
      const membership = await this.getCurrentMembership(id);
      keys = membership?.keys;
    }
    return new Vault(vaultProto, keys);
  };

  public async getMembershipKeys(vaultId: string): Promise<MembershipKeys> {
    const { public: isPublic } = await this.vaultCreationData(vaultId);
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
    const { items, nextToken: nextPage } = await this.client.executeQuery(membershipsByAddressQuery,
      { address: this.config.address, nextToken: options.nextToken, first: getLimit(options.limit) });
    const memberships = await Promise.all(items
      .map(async (item: TxNode) => {
        const membershipId = this.getTagValue(item.tags, "Membership-Id");
        const membership = await this.getMembership(membershipId);
        return membership;
      })) as Array<Membership>;
    return { items: memberships, nextToken: nextPage };
  };

  public async getVaults(options: ListOptions = {}): Promise<Paginated<Vault>> {
    if (!this.config?.address) {
      throw new BadRequest("Missing wallet address in api configuration.");
    }
    const { items, nextToken: nextPage } = await this.client.executeQuery(membershipsByAddressQuery,
      { address: this.config.address, nextToken: options.nextToken, first: getLimit(options.limit) });
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
    const { items, nextToken: nextPage } = await this.client.executeQuery(nodesByVaultIdAndTypeQuery,
      { vaultId, type, nextToken: options.nextToken, first: getLimit(options.limit) });
    const nodes = await Promise.all(items
      .map(async (item: TxNode) => {
        const nodeId = this.getTagValue(item.tags, "Node-Id");
        const node = await this.getNode(nodeId, type);
        return node;
      })) as Array<T>;
    return { items: this.filterByStatus(options.filter, nodes), nextToken: nextPage };
  };

  public async getMembershipsByVaultId(vaultId: string, options: ListOptions): Promise<Paginated<Membership>> {
    const { items, nextToken: nextPage } = await this.client.executeQuery(membershipsByVaultIdQuery,
      { vaultId, nextToken: options.nextToken, first: getLimit(options.limit) });
    const memberships = await Promise.all(items
      .map(async (item: TxNode) => {
        const membershipId = this.getTagValue(item.tags, "Membership-Id");
        const node = await this.getMembership(membershipId);
        return node;
      })) as Array<Membership>;
    return { items: this.filterByStatus(options.filter, memberships), nextToken: nextPage };
  };

  public async getTransactions(vaultId: string): Promise<Array<Transaction>> {
    return await <any>this.client.paginatedQuery(transactionsByVaultIdQuery, { vaultId });
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
      const queryResult = await this.client.executeQuery(vaultsByTagsQuery, { tags: this.processTags(options.tags.values), nextToken: options.nextToken });
      items = queryResult.items;
      nextToken = queryResult.nextToken;
    } else {
      const queryResult = await this.client.executeQuery(listPublicVaultsQuery, { nextToken: options.nextToken });
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
      const queryResult = await this.client.executeQuery(nodesByTagsAndTypeQuery, { type, tags: this.processTags(options.tags.values), nextToken: options.nextToken });
      items = queryResult.items;
      nextToken = queryResult.nextToken;
    } else {
      const queryResult = await this.client.executeQuery(listPublicNodesByTypeQuery, { type, nextToken: options.nextToken });
      items = queryResult.items;
      nextToken = queryResult.nextToken;
    }
    const nodes = await Promise.all(items
      .map(async (item: TxNode) => {
        const nodeId = this.getTagValue(item.tags, "Node-Id");
        const node = await this.getNode<T>(nodeId, type);
        return nodeLikeFactory(node, type, []) as unknown as T;
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

  private getDataTx(object: Object) {
    return object.data?.[object.data.length - 1];
  };

  private processTags(tags: string[]): string[] {
    const processedTags = [] as string[];
    tags?.map((tag: string) =>
      tag.split(" ").map((value: string) => processedTags.push(value.toLowerCase())));
    return processedTags;
  };

  private async vaultCreationData(vaultId: string): Promise<{ public: boolean, createdAt: string }> {
    const { items } = await this.client.executeQuery(vaultCreationQuery, { vaultId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.vaultCreationQuery, { vaultId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find vault with id: " + vaultId);
      }
    }
    return {
      public: this.getTagValue(item.tags, "Public") === "true" ? true : false,
      createdAt: this.getTagValue(item.tags, "Timestamp")
    };
  }

  private async vaultLastUpdateData(vaultId: string): Promise<{ updatedAt: string }> {
    const { items } = await this.client.executeQuery(vaultLastUpdateQuery, { vaultId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.vaultLastUpdateQuery, { vaultId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find vault with id: " + vaultId);
      }
    }
    return {
      updatedAt: this.getTagValue(item.tags, "Timestamp")
    };
  }

  private async getVaultStatus(vaultId: string): Promise<string> {
    const { items } = await this.client.executeQuery(vaultStatusQuery, { vaultId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.vaultStatusQuery, { vaultId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find vault with id: " + vaultId);
      }
    }
    const functionName = this.getTagValue(item.tags, "Function-Name");
    if (functionName === "vault:init" || functionName === "vault:restore") {
      return "ACTIVE";
    } else {
      return "ARCHIVED";
    }
  }

  private async nodeCreationData(nodeId: string): Promise<{ createdAt: string }> {
    const { items } = await this.client.executeQuery(nodeCreationQuery, { nodeId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.nodeCreationQuery, { nodeId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find node with id: " + nodeId);
      }
    }
    return {
      createdAt: this.getTagValue(item.tags, "Timestamp")
    };
  }

  private async nodeLastUpdateData(nodeId: string): Promise<{ updatedAt: string }> {
    const { items } = await this.client.executeQuery(nodeLastUpdateQuery, { nodeId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.nodeLastUpdateQuery, { nodeId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find node with id: " + nodeId);
      }
    }
    return {
      updatedAt: this.getTagValue(item.tags, "Timestamp")
    };
  }

  private async getNodeStatus(nodeId: string): Promise<string> {
    const { items } = await this.client.executeQuery(nodeStatusQuery, { nodeId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.nodeStatusQuery, { nodeId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find node with id: " + nodeId);
      }
    }
    const functionName = this.getTagValue(item.tags, "Function-Name");
    if (functionName === "node:create" || functionName === "node:restore") {
      return "ACTIVE";
    } else {
      return "REVOKED";
    }
  }


  private async getNodeParentId(nodeId: string): Promise<string> {
    const { items } = await this.client.executeQuery(nodeParentIdQuery, { nodeId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.nodeParentIdQuery, { nodeId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find node with id: " + nodeId);
      }
    }
    const input = this.getTagValue(item.tags, "Input");
    const parentId = JSON.parse(input).parentId;
    return parentId ? parentId : null;
  }


  private async getMembershipStatus(membershipId: string): Promise<string> {
    const { items } = await this.client.executeQuery(membershipStatusQuery, { membershipId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.membershipStatusQuery, { membershipId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find membership with id: " + membershipId);
      }
    }
    const functionName = this.getTagValue(item.tags, "Function-Name");
    if (functionName === "membership:invite") {
      return "PENDING";
    } else if (functionName === "membership:accept" || functionName === "membership:add") {
      return "ACCEPTED";
    } else {
      return "REVOKED";
    }
  }

  private async membershipCreationData(membershipId: string): Promise<{ createdAt: string }> {
    const { items } = await this.client.executeQuery(membershipCreationQuery, { membershipId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.membershipCreationQuery, { membershipId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find membership with id: " + membershipId);
      }
    }
    return {
      createdAt: this.getTagValue(item.tags, "Timestamp")
    };
  }

  private async membershipLastUpdateData(membershipId: string): Promise<{ updatedAt: string }> {
    const { items } = await this.client.executeQuery(membershipLastUpdateQuery, { membershipId });
    let item = items[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.membershipLastUpdateQuery, { membershipId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find membership with id: " + membershipId);
      }
    }
    return {
      updatedAt: this.getTagValue(item.tags, "Timestamp")
    };
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
      if (name === "Function-Name") {
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

    const { items } = await this.client.executeQuery(membershipByAddressAndVaultIdQuery,
      { address: this.config.address, vaultId });
    const membershipId = this.getTagValue(items?.[0]?.tags, "Membership-Id");
    const { items: memberships } = await this.client.executeQuery(membershipDataQuery, { membershipId });
    let item = memberships[0];
    if (!item) {
      const { items } = await this.client.executeQuery(legacyQueries.membershipDataQuery, { membershipId });
      item = items[0];
      if (!item) {
        throw new NotFound("Cannot find membership with id: " + membershipId);
      }
    }
    const input = this.getTagValue(item.tags, "Input");
    const functionName = this.getTagValue(item.tags, "Function-Name");
    const dataTx = functionName === "vault:init" ? JSON.parse(input).data.membership : JSON.parse(input).data;
    const state = await this.getNodeState(dataTx);

    const nodeProto = {
      owner: this.getTagValue(item.tags, "Contract"),
      createdAt: this.getTagValue(item.tags, "Timestamp"),
      updatedAt: this.getTagValue(item.tags, "Timestamp"),
      status: await this.getMembershipStatus(membershipId),
      ...state
    } as Membership;
    return new Membership(nodeProto, state.keys);
  }

  private async withVaultContext(object: Membership | NodeLike, vaultId: string): Promise<any> {
    const isPublic = (await this.vaultCreationData(vaultId)).public;
    const vaultContext = { __public__: isPublic, __cacheOnly__: false };
    let encryptionContext: { __keys__?: EncryptedKeys[], __publicKey__?: null } = {};
    if (!isPublic) {
      const membership = await this.getCurrentMembership(vaultId);
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
