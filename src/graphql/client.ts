import { GraphQLClient } from "graphql-request";

const executeQuery = async function (query: any, variables: any): Promise<{ items: TxNode[], nextToken: string }> {
  const client = new GraphQLClient("https://arweave.net/graphql", { headers: {} })
  const result = await client.request(query, variables) as GraphQLResult;
  let nextToken = undefined as any;
  const hasNextPage = result?.transactions?.pageInfo?.hasNextPage;
  if (hasNextPage) {
    nextToken = result?.transactions?.edges?.[result.transactions.edges.length - 1].cursor;
  }
  const items = (result?.transactions.edges || []).map((edge: Edge) => edge.node);
  return { items, nextToken };
};

const paginatedQuery = async function (query: any, variables: any): Promise<TxNode[]> {
  let nextToken = undefined;
  let results: TxNode[] = [];
  do {
    const { items, nextToken: nextPage } = await executeQuery(query, variables);
    results = results.concat(items);
    if (nextPage === "null") {
      nextToken = undefined;
    }
    variables.nextToken = nextPage;
  } while (nextToken);
  return results;
};

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

export { executeQuery, paginatedQuery };