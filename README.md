# Akord Explorer API

A decentralized implementation of [Akord API](https://github.com/Akord-com/akord-js/blob/main/src/api/api.ts) to read Akord content directly from the [permaweb](https://www.arweave.org/).

## Usage
```javascript
const wallet = await AkordWallet.importFromBackupPhrase("your backup phrase here");
const akord = await Akord.init(wallet, { api: new ExplorerApi(await wallet.getAddress()) });
const vaults = await akord.vault.listAll();
```