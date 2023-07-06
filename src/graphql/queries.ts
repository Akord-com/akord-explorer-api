import { gql } from "graphql-request";

const timelineQuery = gql`
query transactions($vaultId: String!, $protocolName: String!) {
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
      }
  }
}
`;

const membershipsQuery = gql`
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
      }
  }
}
`;

const nodesQuery = gql`
query nodesByVaultIdAndType($vaultId: String!, $objectType: String!, $protocolName: String!) {
  transactions(
      tags: [
        {
          name: "Vault-Id",
          values: [$vaultId]
        },
        {
          name: "Node-Type",
          values: [$objectType]
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

const nodeVaultIdQuery = gql`
query nodesById($id: String!, $protocolName: String!) {
  transactions(
      tags: [
        {
          name: "Node-Id",
          values: [$id]
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
      }
  }
}
`;

const vaultsQuery = gql`
query vaults($protocolName: String!) {
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
      }
  }
}
`;

const nodesByTypeQuery = gql`
query nodesByType($objectType: String!, $protocolName: String!) {
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
      }
  }
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
      }
  }
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
      }
  }
}
`;

const vaultDataLegacyQuery = gql`
query vaultDataLegacyQuery($vaultId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Vault-Id",
          values: [$vaultId]
        },
        {
          name: "Command",
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
      }
  }
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
      }
  }
}
`;

const nodeDataLegacyQuery = gql`
query nodeDataLegacyQuery($vaultId: String!, $nodeId: String!, $protocolName: String!) {
  transactions(
    sort: HEIGHT_DESC,
    first: 1,
      tags: [
        {
          name: "Vault-Id",
          values: [$vaultId]
        },
        {
          name: "Node-Id",
          values: [$nodeId]
        },
        {
          name: "Command",
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
      }
  }
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
      }
  }
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
      }
  }
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
      }
  }
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
      }
  }
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
      }
  }
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
      }
  }
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
      }
  }
}
`;

export {
  timelineQuery,
  membershipsQuery,
  nodesQuery,
  nodeVaultIdQuery,
  membershipsByVaultIdQuery,
  vaultsByTagsQuery,
  vaultsQuery,
  nodesByTypeQuery,
  nodesByTagsAndTypeQuery,
  vaultDataQuery,
  vaultDataLegacyQuery,
  vaultLastUpdateQuery,
  nodeDataQuery,
  nodeDataLegacyQuery,
  membershipStatusQuery,
  vaultStatusQuery,
  vaultCreationQuery,
  nodeStatusQuery,
  membershipDataQuery,
  membershipByAddressAndVaultIdQuery
}