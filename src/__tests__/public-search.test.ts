import { Folder } from "@akord/akord-js";
import { ExplorerApi } from "../api";

let publicExplorerApi: ExplorerApi;

jest.setTimeout(3000000);

describe("Testing explorer api queries", () => {
  beforeAll(async () => {
    publicExplorerApi = new ExplorerApi({ debug: true });
  });

  it("should list all vaults with at least one tag within the given list", async () => {
    const { data, errors } = await publicExplorerApi.listAllPublicVaults({
      tags: {
        values: ["Health Seychelles Morning dynamic"],
        searchCriteria: "CONTAINS_SOME"
      },
      minCreatedAt: new Date("2023-06-14T16:47:03.844Z"),
      maxCreatedAt: new Date(1686761223844)
    });
    console.log(data);
  });

  it("should list public folders with pagination", async () => {
    const { items: folders, nextToken } = await publicExplorerApi.listPublicNodes<Folder>("Folder");
    console.log(folders);
    console.log(nextToken);
  });
});