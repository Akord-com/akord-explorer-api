import { Akord, Auth } from "@akord/akord-js";
import { ExplorerApi } from "../api";
import { AkordWallet } from "@akord/crypto";

let akord: Akord;
let explorerApi: ExplorerApi;

jest.setTimeout(3000000);

const backupPhrase = "multiply trust menu shove loyal tail absorb run circle bulb route scan";
const vaultId = "KZR_EXZwiy8UdzgKppGbNKTqjl1XfK4VAC59TPZxI-w";
const vaultId2 = "u2jfzXI9xGySt1pTh2xaUMAM6j8wgBUJBoM66pfAS8E";

describe("Testing explorer api queries", () => {
  beforeAll(async () => {
    const wallet = await AkordWallet.importFromBackupPhrase(backupPhrase);
    explorerApi = new ExplorerApi({ address: await wallet.getAddress(), debug: true });
    akord = await Akord.init(wallet, { api: explorerApi, debug: true });
  });

  it("should follow vault", async () => {
    const txId = await explorerApi.vaultFollow(vaultId);
    console.log("VAULT FOLLOWED: " + txId);
  });

  it("should display number of vault followers", async () => {
    const count = await explorerApi.vaultFollowersCount(vaultId);
    console.log("Number of vault followers: " + count);
  });

  // it("should fail following same vault twice", async () => {
  //   await expect(async () => {
  //     await explorerApi.vaultFollow(vaultId);
  //   }).rejects.toThrow(Error);
  // });

  it("should follow another vault", async () => {
    const txId = await explorerApi.vaultFollow(vaultId2);
    console.log("VAULT FOLLOWED: " + txId);
  });

  it("should list all followed vaults", async () => {
    const vaults = await explorerApi.vaultFollowList();
    console.log(vaults);
  });
});