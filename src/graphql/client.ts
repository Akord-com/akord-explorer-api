import { GraphQLClient } from "graphql-request";
import { ApiConfig } from "../config";

export class ApiClient {

  client: GraphQLClient;
  config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.client = new GraphQLClient(config.arweaveUrl + "graphql", { headers: {} });
  }

  public async executeQuery(query: any, variables: any): Promise<{ items: TxNode[], nextToken: string }> {
    variables.protocolName = this.config.protocolName;
    const result = await this.client.request(query, variables) as GraphQLResult;
    let nextToken = undefined as any;
    const hasNextPage = result?.transactions?.pageInfo?.hasNextPage;
    if (hasNextPage) {
      nextToken = result?.transactions?.edges?.[result.transactions.edges.length - 1].cursor;
    }
    const items = (result?.transactions.edges || []).map((edge: Edge) => edge.node);
    return { items, nextToken };
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