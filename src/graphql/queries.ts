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

const membershipVaultIdQuery = gql`
query membershipsById($id: String!, $protocolName: String!) {
  transactions(
      tags: [
        {
          name: "Membership-Id",
          values: [$id]
        },
        {
          name: "Function-Name",
          values: ["membership:invite", "vault:init"]
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


export {
  timelineQuery,
  membershipsQuery,
  nodesQuery,
  nodeVaultIdQuery,
  membershipVaultIdQuery,
  vaultsByTagsQuery,
  vaultsQuery,
  nodesByTypeQuery,
  nodesByTagsAndTypeQuery
}