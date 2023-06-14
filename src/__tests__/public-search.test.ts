import { Stack } from "@akord/akord-js";
import { ExplorerApi } from "../api";

let publicExplorerApi: ExplorerApi;

jest.setTimeout(3000000);

describe("Testing explorer api queries", () => {
  beforeAll(async () => {
    publicExplorerApi = new ExplorerApi();
  });

  it("should list all vaults with tag \"podcast\" ", async () => {
    const vaults = await publicExplorerApi.listAllVaults({ tags: { values: ["Health Seychelles"] } });
    console.log(vaults);
  });

  it("should list all stacks", async () => {
    const stacks = await publicExplorerApi.listAllNodes<Stack>("Stack");
    console.log(stacks);
  });
});