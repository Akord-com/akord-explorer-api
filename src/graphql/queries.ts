import { gql } from "graphql-request";

const timelineQuery = gql`
query transactions($vaultId: String!) {
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
          values: ["Akord", "Akord-Test"]
        }
      ]
  ) {
      edges {
          node {
              id
              tags {
                name
                value
              }
          }
      }
  }
}
`;

const membershipsQuery = gql`
query membershipsByAddress($address: String!) {
  transactions(
      tags: [
        {
          name: "Member-Address",
          values: [$address]
        },
        {
          name: "Protocol-Name",
          values: ["Akord", "Akord-Test"]
        }
      ]
  ) {
      edges {
          node {
              id
              tags {
                name
                value
              }
          }
      }
  }
}
`;

const nodesQuery = gql`
query nodesByVaultIdAndType($vaultId: String!, $objectType: String!) {
  transactions(
      tags: [
        {
          name: "Node-Type",
          values: [$objectType]
        },
        {
          name: "Command",
          values: ["Node-Create"]
        },
        {
          name: "Protocol-Name",
          values: ["Akord", "Akord-Test"]
        }
      ]
  ) {
      edges {
          node {
              id
              tags {
                name
                value
              }
          }
      }
  }
}
`;

export {
  timelineQuery,
  membershipsQuery,
  nodesQuery
}