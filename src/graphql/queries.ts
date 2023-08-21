import { gql } from "graphql-request";

const TxNode = gql`
  fragment TxNode on TransactionEdge {
    edges {
      cursor
      node {
          id
          tags {
            name
            value
          }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
`

const timelineQuery = gql`
query transactionsByContract($vaultId: String!, $protocolName: String!, $limit: Int, $nextToken: String) {
  transactions(
      first: $limit,
      after: $nextToken,
      tags: [
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        },
        {
          name: "Contract",
          values: [$vaultId]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const transactionsByVaultIdQuery = gql`
query transactionsByVaultId($id: String!, $protocolName: String!) {
  transactions(
      sort: HEIGHT_DESC,
      first: 100,
      tags: [
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        },
        {
          name: "Vault-Id",
          values: [$id]
        },
        {
          name:"Function-Name"
          values: ["vault:init", "vault:update", "vault:archive", "vault:restore"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const transactionsByNodeIdQuery = gql`
query transactionsByNodeId($id: String!, $protocolName: String!) {
  transactions(
      sort: HEIGHT_DESC,
      first: 100,
      tags: [
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        },
        {
          name: "Node-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["node:create", "node:update", "node:revoke", "node:restore", "node:move", "node:delete"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const transactionsByMembershipIdQuery = gql`
    query transactionsByMembershipId($id: String!, $protocolName: String!) {
      transactions(
          sort: HEIGHT_DESC,
          first: 100,
          tags: [
            {
              name: "App-Name",
              values: ["SmartWeaveAction"]
            },
            {
              name: "Membership-Id",
              values: [$id]
            },
            {
              name:"Function-Name"
              values: ["vault:init", "membership:invite", "membership:add", "membership:revoke", "membership:add", "membership:accept", "membership:update", "membership:key-rotate"]
            },
            {
              name: "Protocol-Name",
              values: [$protocolName, "Akord-Test"]
            }
          ]
          ) {
            edges {
              cursor
              node {
                  id
                  tags {
                    name
                    value
                  }
              }
            }
            pageInfo {
              hasNextPage
            }      }
        }
        `;


const membershipsByAddressQuery = gql`
query membershipsByAddress($address: String!, $protocolName: String!, $limit: Int, $nextToken: String) {
  transactions(
    sort: HEIGHT_ASC,
    first: $limit,
    after: $nextToken,
      tags: [
        {
          name: "Member-Address",
          values: [$address]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const nodesByVaultIdAndTypeQuery = gql`
query nodesByVaultIdAndType($vaultId: String!, $type: String!, $protocolName: String!, $limit: Int, $nextToken: String) {
  transactions(
      sort: HEIGHT_ASC,
      first: $limit,
      after: $nextToken,
      tags: [
        {
          name: "Vault-Id",
          values: [$vaultId]
        },
        {
          name: "Node-Type",
          values: [$type]
        },
        {
          name:"Function-Name"
          values: ["node:create"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
  ) {
    edges {
      cursor
      node {
          id
          tags {
            name
            value
          }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
`;

const nodesByParentIdAndTypeQuery = gql`
query nodesByParentIdAndType($parentId: String!, $vaultId: String!, $type: String!, $protocolName: String!, $limit: Int, $nextToken: String) {
  transactions(
      sort: HEIGHT_ASC,
      first: $limit,
      after: $nextToken,
      tags: [
        {
          name: "Parent-Id",
          values: [$parentId]
        },
        {
          name: "Vault-Id",
          values: [$vaultId]
        },
        {
          name: "Node-Type",
          values: [$type]
        },
        {
          name:"Function-Name"
          values: ["node:create", "node:move"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
  ) {
    edges {
      cursor
      node {
          id
          tags {
            name
            value
          }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
`;

const membershipsByVaultIdQuery = gql`
query membershipsByVaultId($vaultId: String!, $protocolName: String!, $limit: Int, $nextToken: String) {
  transactions(
    sort: HEIGHT_ASC,
    first: $limit,
    after: $nextToken,
      tags: [
        {
          name: "Vault-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["membership:invite", "membership:add", "vault:init"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
    `;

const vaultsByTagsQuery = gql`
query vaultsByTags($tags: [String!]!, $protocolName: String!, $limit: Int, $nextToken: String) {
  transactions(
      first: $limit,
      after: $nextToken,
      tags: [
        {
          name: "Akord-Tag",
          values: $tags
        },
        {
          name: "Function-Name",
          values: ["vault:init", "vault:update"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "Public",
          values: ["true"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const listPublicVaultsQuery = gql`
query listPublicVaults($protocolName: String!, $limit: Int, $nextToken: String) {
  transactions(
      first: $limit,
      after: $nextToken,
      tags: [
        {
          name: "Function-Name",
          values: ["vault:init"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "Public",
          values: ["true"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const listPublicNodesByTypeQuery = gql`
query listPublicNodesByTypeQuery($type: String!, $protocolName: String!, $limit: Int, $nextToken: String) {
  transactions(
      first: $limit,
      after: $nextToken,
      tags: [
        {
          name: "Function-Name",
          values: ["node:create"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "Public",
          values: ["true"]
        },
        {
          name: "Node-Type",
          values: [$type]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const nodesByTagsAndTypeQuery = gql`
query nodesByTagsAndType($tags: [String!]!, $type: String!, $protocolName: String!) {
  transactions(
      tags: [
        {
          name: "Akord-Tag",
          values: $tags
        },
        {
          name: "Function-Name",
          values: ["node:create", "node:update"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "Public",
          values: ["true"]
        },
        {
          name: "Node-Type",
          values: [$type]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const vaultDataQuery = gql`
query vaultDataQuery($id: String!, $protocolName: String!) {
  transactions(
      sort: HEIGHT_DESC,
      first: 1,
      tags: [
        {
          name: "Vault-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["vault:update", "vault:init"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const nodeDataQuery = gql`
query nodeDataQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["node:update", "node:create"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const membershipDataQuery = gql`
query membershipQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Membership-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "membership:invite", "membership:key-rotate", "membership:update"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const membershipByAddressAndVaultIdQuery = gql`
query membershipQuery($address: String!, $vaultId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Vault-Id",
          values: [$vaultId]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "membership:invite", "membership:add"]
        },
        {
          name: "Member-Address",
          values: [$address]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const nodeStatusQuery = gql`
query nodeStatusQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["node:create", "node:revoke", "node:restore", "node:delete"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;


const nodeParentIdQuery = gql`
query nodeParentIdQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["node:create", "node:move"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;


const vaultStatusQuery = gql`
query vaultStatusQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Vault-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "vault:archive", "vault:restore"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const vaultLastUpdateQuery = gql`
query vaultLastUpdateQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Vault-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "vault:archive", "vault:restore", "vault:update"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const nodeLastUpdateQuery = gql`
query nodeLastUpdateQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["node:create", "node:update", "node:restore", "node:revoke", "node:move", "node:delete"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const membershipLastUpdateQuery = gql`
query membershipLastUpdateQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Membership-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "membership:invite", "membership:add", "membership:revoke", "membership:add", "membership:accept", "membership:update"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const vaultCreationQuery = gql`
query vaultCreationQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Vault-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["vault:init"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const nodeCreationQuery = gql`
query nodeCreationQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["node:create"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const membershipCreationQuery = gql`
query membershipCreationQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Membership-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["membership:invite", "membership:add", "vault:init"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const membershipStatusQuery = gql`
query membershipStatusQuery($id: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Membership-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "membership:invite", "membership:accept", "membership:add", "membership:revoke"]
        },
        {
          name: "Protocol-Name",
          values: [$protocolName, "Akord-Test"]
        },
        {
          name: "App-Name",
          values: ["SmartWeaveAction"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const followContractQuery = gql`
query followContractQuery($address: String!) {
  transactions(
      sort: HEIGHT_DESC,
      first: 1,
      tags: [
        {
          name: "App-Name",
          values: ["SmartWeaveContract"]
        },
        {
          name: "User-Address",
          values: [$address]
        },
        {
          name: "Protocol-Name",
          values: ["Follow-Contract-Test"]
        }
      ]
      ) {
        edges {
          cursor
          node {
              id
              tags {
                name
                value
              }
          }
        }
        pageInfo {
          hasNextPage
        }      }
    }
    `;

const followersCountQuery = gql`
    query followersCountQuery($txId: String!, $limit: Int, $nextToken: String) {
      transactions(
          sort: HEIGHT_DESC,
          first: $limit,
          after: $nextToken,
          tags: [
            {
              name: "App-Name",
              values: ["SmartWeaveAction"]
            },
            {
              name: "Function-Name",
              values: ["follow"]
            },
            {
              name: "Tx-Id",
              values: [$txId]
            },
            {
              name: "Protocol-Name",
              values: ["Follow-Contract-Test"]
            }
          ]
          ) {
            edges {
              cursor
              node {
                  id
                  tags {
                    name
                    value
                  }
              }
            }
            pageInfo {
              hasNextPage
            }      }
        }
        `;

export {
  timelineQuery,
  transactionsByVaultIdQuery,
  transactionsByNodeIdQuery,
  transactionsByMembershipIdQuery,
  membershipsByAddressQuery,
  nodesByVaultIdAndTypeQuery,
  nodesByParentIdAndTypeQuery,
  membershipsByVaultIdQuery,
  vaultsByTagsQuery,
  listPublicVaultsQuery,
  listPublicNodesByTypeQuery,
  nodesByTagsAndTypeQuery,
  vaultDataQuery,
  vaultLastUpdateQuery,
  membershipLastUpdateQuery,
  nodeLastUpdateQuery,
  nodeDataQuery,
  membershipStatusQuery,
  vaultStatusQuery,
  nodeStatusQuery,
  nodeParentIdQuery,
  membershipCreationQuery,
  vaultCreationQuery,
  nodeCreationQuery,
  membershipDataQuery,
  membershipByAddressAndVaultIdQuery,
  followContractQuery,
  followersCountQuery
}