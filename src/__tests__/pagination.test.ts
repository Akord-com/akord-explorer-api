
import { Akord } from "@akord/akord-js";
import { ExplorerApi } from "../api";

let akord: Akord;
let explorerApi: ExplorerApi;

jest.setTimeout(3000000);

const vaultId = "FZWZ1gW5BT1Ar1EsajsXXXhOdIal0XY60lYkvfSTELQ";

jest.setTimeout(3000000);

describe("Testing explorer api queries", () => {
  beforeAll(async () => {
    explorerApi = new ExplorerApi({ debug: true });
    akord = new Akord(undefined, { api: explorerApi, debug: true });
  });

  it("should get public vault", async () => {
    const vault = await akord.vault.get(vaultId);
    console.log(vault);
  });

  it("should list 20 stack items", async () => {
    const { items: firstPage, nextToken } = await akord.stack.list(vaultId, { limit: 10 });
    console.log(firstPage);
    console.log(nextToken);
    const { items: secondPage } = await akord.stack.list(vaultId, { limit: 10, nextToken: nextToken });
    console.log(secondPage);
  });

  it("should list all stacks", async () => {
    const vault = await akord.vault.get(vaultId, { deep: true });
    console.log(vault);
    expect(vault.stacks?.length).toBeTruthy();
    console.log(vault.stacks?.[0]);
  });
});