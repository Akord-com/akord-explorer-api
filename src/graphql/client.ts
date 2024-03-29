import { GraphQLClient } from "graphql-request";
import { ApiConfig } from "../config";
import { Logger } from "../logger";
import { InternalError } from "@akord/akord-js/lib/errors/internal-error";

const RETRY_MAX = 5;

export class ApiClient {

  client: GraphQLClient;
  config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.client = new GraphQLClient(config.arweaveUrl + "graphql", { headers: {} });
  }

  public async executeQuery(query: any, variables: any): Promise<{ items: TxNode[], nextToken: string }> {
    variables.protocolName = this.config.protocolName;
    let retryCount = 0;
    while (retryCount < RETRY_MAX) {
      try {
        const result = await this.client.request(query, variables) as GraphQLResult;
        let nextToken = undefined as any;
        const hasNextPage = result?.transactions?.pageInfo?.hasNextPage;
        if (hasNextPage) {
          nextToken = result?.transactions?.edges?.[result.transactions.edges.length - 1].cursor;
        }
        let items = (result?.transactions.edges || []).map((edge: Edge) => edge.node);
        // filter out Warp tx duplicates
        if (items.length > 1) {
          items = items.filter((node: TxNode) => node.tags.findIndex((tag) => tag.name === "Action" && tag.value === "WarpInteraction") < 0);
        }
        return { items, nextToken };
      } catch (error: any) {
        Logger.log(error);
        Logger.log(error.message);
        if (error?.response?.status === 504) {
          Logger.log("Retrying...");
          retryCount++;
          Logger.log("Retry count: " + retryCount);
        } else {
          throw error;
        }
      }
    }
    Logger.log(`Request failed after ${RETRY_MAX} attempts.`);
    throw new InternalError("Cannot satisfy the request. Try again later, or contact the app or website owner.");
  }

  public async paginatedQuery(query: any, variables: any): Promise<TxNode[]> {
    let nextToken = undefined;
    let results: TxNode[] = [];
    do {
      const { items, nextToken: nextPage } = await this.executeQuery(query, variables);
      results = results.concat(items);
      if (nextPage === "null") {
        nextToken = undefined;
      }
      variables.nextToken = nextPage;
      nextToken = nextPage;
    } while (nextToken);
    return results;
  }
}
export type TxNode = {
  id: string
  tags: {
    name: string
    value: string
  }[]
}

export type Edge = {
  cursor: string
  node: TxNode
}

export type GraphQLResult = {
  transactions: {
    edges: Edge[],
    pageInfo: {
      hasNextPage: boolean
    }
  }
}