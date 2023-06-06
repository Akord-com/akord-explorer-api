# Akord Explorer API

A decentralized implementation of [Akord API](https://github.com/Akord-com/akord-js/blob/main/src/api/api.ts) to read Akord content directly from the [permaweb](https://www.arweave.org/).

## Usage
```javascript
import { Akord } from "@akord/akord-js";
import { AkordWallet } from "@akord/crypto";
import { ExplorerApi } from "@akord/akord-explorer-api";
const wallet = await AkordWallet.importFromBackupPhrase("your backup phrase here");
const explorerApi = new ExplorerApi(await wallet.getAddress());
const akord = await Akord.init(wallet, { api: explorerApi });
const vaults = await akord.vault.listAll();
```