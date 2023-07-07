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

const transactionsByVaultIdQuery = gql`
query transactionsByVaultId($vaultId: String!, $protocolName: String!) {
  transactions(
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

const membershipsByAddressQuery = gql`
query membershipsByAddress($address: String!, $protocolName: String!) {
  transactions(
      tags: [
        {
          name: "Member-Address",
          values: [$address]
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

const nodesByVaultIdAndTypeQuery = gql`
query nodesByVaultIdAndType($vaultId: String!, $type: String!, $protocolName: String!) {
  transactions(
      sort: HEIGHT_ASC,
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
query membershipsByVaultId($vaultId: String!, $protocolName: String!) {
  transactions(
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
query vaultsByTags($tags: [String!]!, $protocolName: String!) {
  transactions(
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
query listPublicVaults($protocolName: String!) {
  transactions(
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
query listPublicNodesByTypeQuery($type: String!, $protocolName: String!) {
  transactions(
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
query nodesByTagsAndType($tags: [String!]!, $objectType: String!, $protocolName: String!) {
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
          values: [$objectType]
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
query vaultDataQuery($vaultId: String!, $protocolName: String!) {
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
          values: ["vault:update", "vault:init"]
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

const nodeDataQuery = gql`
query nodeDataQuery($nodeId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$nodeId]
        },
        {
          name: "Function-Name",
          values: ["node:update", "node:create"]
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

const membershipDataQuery = gql`
query membershipQuery($membershipId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Membership-Id",
          values: [$membershipId]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "membership:invite", "membership:key-rotate", "membership:update"]
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
query nodeStatusQuery($nodeId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$nodeId]
        },
        {
          name: "Function-Name",
          values: ["node:create", "node:revoke", "node:restore"]
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


const nodeParentIdQuery = gql`
query nodeParentIdQuery($nodeId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$nodeId]
        },
        {
          name: "Function-Name",
          values: ["node:create", "node:move"]
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


const vaultStatusQuery = gql`
query vaultStatusQuery($vaultId: String!, $protocolName: String!) {
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
          values: ["vault:init", "vault:archive", "vault:restore"]
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

const vaultLastUpdateQuery = gql`
query vaultLastUpdateQuery($vaultId: String!, $protocolName: String!) {
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
          values: ["vault:init", "vault:archive", "vault:restore", "vault:update"]
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

const nodeLastUpdateQuery = gql`
query nodeLastUpdateQuery($nodeId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$nodeId]
        },
        {
          name: "Function-Name",
          values: ["node:create", "node:update", "node:restore", "node:revoke"]
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

const membershipLastUpdateQuery = gql`
query membershipLastUpdateQuery($membershipId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Membership-Id",
          values: [$membershipId]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "membership:invite", "membership:add", "membership:revoke", "membership:add", "membership:accept", "membership:update"]
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

const vaultCreationQuery = gql`
query vaultCreationQuery($vaultId: String!, $protocolName: String!) {
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
          values: ["vault:init"]
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

const nodeCreationQuery = gql`
query nodeCreationQuery($nodeId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Node-Id",
          values: [$nodeId]
        },
        {
          name: "Function-Name",
          values: ["node:create"]
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

const membershipCreationQuery = gql`
query membershipCreationQuery($membershipId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Membership-Id",
          values: [$membershipId]
        },
        {
          name: "Function-Name",
          values: ["membership:invite", "membership:add", "vault:init"]
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

const membershipStatusQuery = gql`
query membershipStatusQuery($membershipId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Membership-Id",
          values: [$membershipId]
        },
        {
          name: "Function-Name",
          values: ["vault:init", "membership:invite", "membership:accept", "membership:add", "membership:revoke"]
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

export {
  transactionsByVaultIdQuery,
  membershipsByAddressQuery,
  nodesByVaultIdAndTypeQuery,
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
  membershipByAddressAndVaultIdQuery
}