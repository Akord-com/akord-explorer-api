import { GraphQLClient } from "graphql-request";

const executeQuery = async function (query: any, variables: any) {
  const client = new GraphQLClient("https://arweave.net/graphql", { headers: {} })
  const result = await client.request(query, variables);
  let nextToken = undefined;
  const hasNextPage = result?.transactions?.pageInfo?.hasNextPage;
  if (hasNextPage) {
    nextToken = result?.transactions?.edges?.[result.transactions.edges.length - 1].cursor;
  }
  const items = (result?.transactions.edges || []).map((edge: any) => edge.node);
  return { items, nextToken };
};

const paginatedQuery = async function (query: any, variables: any) {
  let nextToken = undefined;
  let results = [];
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

export { executeQuery, paginatedQuery };