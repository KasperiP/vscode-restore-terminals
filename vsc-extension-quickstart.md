# Developing this extension

## Requirements

- Node.js 26 or newer
- pnpm 10 (pinned via the `packageManager` field — `corepack enable` will pick it up)

## What's in the folder

- `package.json` - the extension manifest: the `Restore Terminals` command and every `restoreTerminals.*` setting are declared here.
- `src/extension.ts` - entry point. Exports `activate`, which registers the command and restores terminals on startup.
- `src/restoreTerminals.ts` - creates the terminal windows and their splits, then sends the configured commands.
- `src/configuration.ts` - merges `settings.json` with an optional `.vscode/restore-terminals.json` (the file wins).
- `src/terminalCwd.ts` - resolves `${workspaceFolder}` / `${workspaceFolder:name}` in a terminal window's `cwd`.
- `esbuild.config.js` - bundles `src/extension.ts` into `out/extension.cjs`. The sources are ESM; the bundle is CommonJS because that is what the extension host loads.

## Get up and running straight away

```sh
pnpm install
```

Then press **`F5`** and pick **Run Extension (sample project)** (it is the default). That builds the bundle and opens an Extension Development Host with `sample-test-project` as its workspace, so `sample-test-project/.vscode/restore-terminals.json` is picked up. It sets `runOnStartup: true`, so terminals restore as soon as the window appears.

Other extensions are disabled in that window (`--disable-extensions`) so nothing else can interfere with the terminals.

To test the `settings.json` path instead of the config file, use **Run Extension (empty window)** and add `restoreTerminals.*` settings there.

### Without the debugger

```sh
pnpm run build
code --extensionDevelopmentPath="$PWD" --disable-extensions sample-test-project
```

### Things to check

- The right number of windows and splits, in left-to-right array order
- Terminal names, icons and colours
- Commands landing in the correct terminals
- `shouldRunCommands: false` pastes without executing
- `Restore Terminals` from the command palette re-runs it

Extension output goes to **Output > Restore Terminals**. Set the level to Trace (`Developer: Set Log Level…`) to see each terminal being disposed and created.

## Make changes

- `pnpm run watch` rebundles on save; relaunch from the debug toolbar or reload the window (`Ctrl+R` / `Cmd+R`).
- Local builds are unminified and carry a sourcemap, so breakpoints in `src/*.ts` bind. Only `vscode:prepublish` passes `--production` to minify.
- Types are not checked by esbuild. Run `pnpm run typecheck` (or the `typecheck` task, which watches).

## Checks

```sh
pnpm run typecheck   # tsc --noEmit
pnpm run lint        # eslint, type-aware
pnpm run test:unit   # node --test, runs the .ts sources directly
pnpm test            # all three
```

Unit tests live in `src/test/unit` and use the built-in `node:test` runner. Node runs the TypeScript sources directly via type stripping, so there is no compile step before testing. Anything that needs the real `vscode` API has to be verified by hand in the Extension Development Host — there is no integration-test harness.

## Explore the API

- The full API surface is in `node_modules/@types/vscode/index.d.ts`.

## Publish

Pushing to `master` does not publish anything. Releasing is deliberate:

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry, then merge to `master`.
2. Draft a GitHub Release tagged `v<version>` — the tag must match `package.json` or the workflow stops.
3. Publish the release. `.github/workflows/deploy.yml` packages the extension, runs the checks, attaches the `.vsix` to the release, and then waits for approval before publishing to the Marketplace.

Marking the GitHub Release as a pre-release publishes it to the Marketplace as a pre-release too.

The publish job runs in the `marketplace` environment and never checks out the repository — it only ships the `.vsix` the build job produced, so what you approve is exactly what users receive.

To build a `.vsix` locally: `pnpm run package`.

### One-time setup

1. Create the publisher `KasperiP` at [marketplace.visualstudio.com/manage/publishers](https://marketplace.visualstudio.com/manage/publishers). This is independent of Azure DevOps and works even if you cannot create an organization.
2. Create an Azure DevOps organization at [dev.azure.com](https://dev.azure.com). New organizations must be linked to an active Azure subscription; the free/pay-as-you-go tier is enough.
3. In that organization, create a Personal Access Token with **Organization: All accessible organizations** and scope **Marketplace → Manage**. An organization-scoped token fails with a misleading 401. The Marketplace scope only appears after clicking **Show all scopes**.
4. Create an environment named `marketplace` under Settings → Environments. Add yourself as a **required reviewer**, and add the token as a secret named `VSCE_PAT` **on that environment** rather than as a repository secret, so no other workflow can read it.

### Token expiry

Azure DevOps PATs expire — one year at most. When one lapses the release workflow fails at the publish step with a 401 that looks exactly like a misconfiguration, so it is worth a calendar reminder.

**Global PATs in Azure DevOps are retired on 1 December 2026.** Before then this workflow needs to move to Microsoft Entra ID authentication. The pinned `@vscode/vsce` already supports `--azure-credential` for that, and the migration needs a managed identity with a federated credential rather than a stored secret. See [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).
