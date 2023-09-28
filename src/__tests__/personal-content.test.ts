import { Akord, StorageType } from "@akord/akord-js";
import { AkordWallet } from "@akord/crypto";
import { ExplorerApi } from "../api";

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
    explorerApi = new ExplorerApi({ address: await wallet.getAddress(), debug: true });
    akord = await Akord.init(wallet, { api: explorerApi, debug: true });
  });

  it("should list vaults", async () => {
    const vaults = await akord.vault.listAll();
    expect(vaults.length).toBeTruthy();
    for (let vault of vaults) {
      expect(vault.id).toBeTruthy();
      expect(vault.owner).toBeTruthy();
      expect(vault.name).toBeTruthy();
      expect(vault.createdAt).toBeTruthy();
      expect(vault.updatedAt).toBeTruthy();
      expect(vault.status).toEqual("ACTIVE");
    }
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
    const fileData = await akord.file.get(fileUri, privateVaultId);
    console.log(fileData);
  });

  it("should get membership", async () => {
    const membership = await akord.membership.get('221ca062-9bf1-4673-9e98-6d7eec42e6b1', { vaultId: privateVaultId });
  });

  it("should get public stack & download latest version", async () => {
    const stack = await akord.stack.get(publicStackId, { vaultId: publicVaultId });
    const fileUri = stack.getUri(StorageType.ARWEAVE);
    console.log(fileUri);
    const fileData = await akord.file.get(fileUri, publicVaultId);
    console.log(fileData);
  });

  it("should list all folders", async () => {
    const stacks = await akord.stack.listAll(privateVaultId);
    console.log(stacks);
  });
});