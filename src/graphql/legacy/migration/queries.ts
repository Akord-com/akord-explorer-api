import { gql } from "graphql-request";
import { TxNode } from "../../queries";

const vaultCreationQuery = gql`
      query vaultCreationMigrationQuery($id: String!, $protocolName: String!) {
        transactions(
          sort: HEIGHT_DESC,
          first: 1,
            tags: [
              {
                name: "Uploader-Tx-Id",
                values: [$id]
              },
              {
                name: "Protocol-Name",
                values: [$protocolName, "Akord-Test"]
              },
              {
                name: "App-Name",
                values: ["SmartWeaveContract"]
              }
            ]
            ) { ${TxNode} }
            `;

export {
  vaultCreationQuery
}