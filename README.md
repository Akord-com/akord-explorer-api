# Akord Explorer API

A decentralized implementation of [Akord API](https://github.com/Akord-com/akord-js/blob/main/src/api/api.ts) to read Akord content directly from the [permaweb](https://www.arweave.org/).

## Usage
```
yarn add @akord/akord-explorer-api
```

### Read your personal content
```javascript
import { Akord } from "@akord/akord-js";
import { AkordWallet } from "@akord/crypto";
import { ExplorerApi } from "@akord/akord-explorer-api";

const wallet = await AkordWallet.importFromBackupPhrase("your backup phrase here");
const explorerApi = new ExplorerApi({ address: await wallet.getAddress() });
const akord = await Akord.init(wallet, { api: explorerApi });
const vaults = await akord.vault.listAll();
```

### Search through all Akord public content
```javascript
import { Stack } from "@akord/akord-js";
import { ExplorerApi } from "@akord/akord-explorer-api";

const explorerApi = new ExplorerApi();
// list all public vaults with "podcast" tag
const vaults = explorerApi.listAllVaults({ tags: { values: ["podcast"] } });
// list all public file stacks
const stacks = await explorerApi.listAllNodes<Stack>("Stack");
```

## Development
```
yarn install
yarn build
```

To run all tests:
```
yarn test
```

To run single test file:
```
yarn test <path-to-test-file>

yarn test ./src/__tests__/personal-content.test.ts
```

To run single test file with direct log output:
```
node --inspect node_modules/.bin/jest <path-to-test-file>

node --inspect node_modules/.bin/jest ./src/__tests__/public-search.test.ts
```