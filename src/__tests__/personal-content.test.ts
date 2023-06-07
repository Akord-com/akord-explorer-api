import { Akord } from "@akord/akord-js";
import { AkordWallet } from "@akord/crypto";
import { ExplorerApi } from "../api";
import { StorageType } from "@akord/akord-js/lib/types/node";

let akord: Akord;
let explorerApi: ExplorerApi;

jest.setTimeout(3000000);

const backupPhrase = "multiply trust menu shove loyal tail absorb run circle bulb route scan";
const privateVaultId = "5-H_W6zN47psBKPA_VntmirMJ8-v9pH5BGIGDL-gOGU";
const publicVaultId = "KZR_EXZwiy8UdzgKppGbNKTqjl1XfK4VAC59TPZxI-w";
const privateStackId = "c8f0969d-ca1f-437b-8737-b05e15ee5d1a";
const publicStackId = "ffe5df0b-5523-4c6e-9190-9d104b526402";

describe("Testing explorer api queries", () => {
  beforeAll(async () => {
    const wallet = await AkordWallet.importFromBackupPhrase(backupPhrase);
    explorerApi = new ExplorerApi({ address: await wallet.getAddress() });
    akord = await Akord.init(wallet, { api: explorerApi });
  });

  it("should list vaults", async () => {
    const vaults = await akord.vault.listAll();
    expect(vaults.length).toBeTruthy();
  });

  it("should get private vault", async () => {
    const vault = await akord.vault.get(privateVaultId, { deep: true });
    expect(vault.name).toEqual("private vault 1");
    console.log(vault);
  });

  it("should get public vault", async () => {
    const vault = await akord.vault.get(publicVaultId, { deep: true });
    expect(vault.name).toEqual("public vault");
    console.log(vault);
  });

  it("should get private stack & download latest version", async () => {
    const stack = await akord.stack.get(privateStackId, { vaultId: privateVaultId });
    const fileUri = stack.getUri(StorageType.ARWEAVE);
    console.log(fileUri);
    const file = akord.file.get(fileUri, privateVaultId);
  });

  it("should get public stack & download latest version", async () => {
    const stack = await akord.stack.get(publicStackId, { vaultId: publicVaultId });
    const fileUri = stack.getUri(StorageType.ARWEAVE);
    console.log(fileUri);
    const file = akord.file.get(fileUri, privateVaultId);
  });

  it("should list all folders", async () => {
    const stacks = await akord.stack.listAll(privateVaultId);
    console.log(stacks);
  });
});