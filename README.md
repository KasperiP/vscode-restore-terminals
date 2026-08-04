<img src="./.github/restore-terminals.png" alt="Restore Terminals GitHub-repository banner">

<div align="center">

[![Build Status](https://img.shields.io/github/actions/workflow/status/KasperiP/vscode-restore-terminals/ci.yml?branch=main&style=flat&colorA=2f9fe8&colorB=2f9fe8)](https://github.com/KasperiP/vscode-restore-terminals/actions/workflows/ci.yml)
[![VS Marketplace](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FKasperiP%2Fvscode-restore-terminals%2Fmain%2Fpackage.json&query=%24.version&prefix=v&label=marketplace&style=flat&colorA=2f9fe8&colorB=2f9fe8)](https://marketplace.visualstudio.com/items?itemName=KasperiP.vscode-restore-terminals)
[![License](https://img.shields.io/github/license/KasperiP/vscode-restore-terminals?style=flat&colorA=2f9fe8&colorB=2f9fe8)](https://github.com/KasperiP/vscode-restore-terminals/blob/main/LICENSE)
[![Contributors](https://img.shields.io/github/contributors/KasperiP/vscode-restore-terminals?style=flat&colorA=2f9fe8&colorB=2f9fe8)](https://github.com/KasperiP/vscode-restore-terminals/graphs/contributors)

</div>

# Restore Terminals (Continued)

Automatically spawn integrated terminal windows and split terminals, and run any shell commands when VSCode starts up!

Requires VSCode 1.125.0 or newer.

> [!NOTE]
> This is a community fork of [Restore Terminals](https://github.com/EthanSK/restore-terminals-vscode) by [Ethan Sarif-Kattan](https://github.com/EthanSK), continued with an updated toolchain, modern VSCode APIs and bug fixes. It stays MIT licensed under the original copyright. Your existing configuration works unchanged: the `restoreTerminals.*` settings and `.vscode/restore-terminals.json` are exactly the same.

> [!IMPORTANT]
> Uninstall the original extension before installing this one. Both register the same `Restore Terminals` command, so having both enabled will break one of them and can spawn your terminals twice.

## What's different from the original

- Split terminals use the supported VSCode API instead of a command-and-poll hack, so splitting and naming are more reliable
- Restoration waits for each shell to actually start rather than sleeping for a fixed delay, which makes it much faster
- Commands run through shell integration where the shell supports it
- Working `icon` and new `color` options, plus per-split `cwd`, `env`, `shellPath` and `shellArgs`
- Errors are reported instead of silently doing nothing
- Several bug fixes, listed in the [changelog](CHANGELOG.md)

## How to use

Configure your VSCode settings JSON file to look something like this:

```json
 "restoreTerminals.runOnStartup": true,
 "restoreTerminals.terminals": [
    {
      "cwd": "${workspaceFolder:server}",
      "splitTerminals": [
        {
          "name": "server",
          "icon": "server-process",
          "color": "terminal.ansiGreen",
          "commands": ["npm i", "npm run dev"]
        },
        {
          "name": "client",
          "icon": "browser",
          "color": "terminal.ansiBlue",
          "commands": ["npm run dev:client"]
        },
        {
          "name": "test",
          "icon": "beaker",
          "color": "terminal.ansiMagenta",
          "commands": ["jest --watch"]
        }
      ]
    },
    {
      "splitTerminals": [
        {
          "name": "build & e2e",
          "icon": "tools",
          "color": "terminal.ansiYellow",
          "commands": ["npm run eslint", "npm run build", "npm run e2e"],
          "shouldRunCommands": false
        },
        {
          "name": "worker",
          "icon": "gear",
          "color": "terminal.ansiCyan",
          "commands": ["npm-run-all --parallel redis tsc-watch-start worker"]
        }
      ]
    }
  ]
```

The outer array represents an integrated VSCode terminal window, and the `splitTerminals` array describes how that window is split up. Splits appear left to right in array order.

Set `cwd` on a terminal window when its commands must start in a specific workspace folder. Use `${workspaceFolder}` for a single-root workspace or `${workspaceFolder:folderName}` for a named folder in a multi-root workspace. Restore Terminals fails instead of falling back to the active folder when the requested workspace folder is unavailable.

You can also keep the config in the workspace itself, at `.vscode/restore-terminals.json` ([sample](https://github.com/KasperiP/vscode-restore-terminals/blob/main/sample-test-project/.vscode/restore-terminals.json)). If that file is present it is used, and `settings.json` is the fallback.

## Options

### Where a terminal window opens

Set `location` to `"editor"` on a window to open it as an editor tab rather than in the terminal panel, which suits a long-running log or dev server you want to keep visible next to your code:

```json
{
  "location": "editor",
  "splitTerminals": [{ "name": "logs", "commands": ["npm run logs"] }]
}
```

`location` is set per terminal window, not per split, and the splits open beside their window wherever it is. The other accepted value is `"panel"`. Leave `location` out and VSCode's own `terminal.integrated.defaultLocation` setting decides.

### Icons and colours

Every terminal, including each split, can set its own `icon` and `color` so you can tell them apart at a glance in the terminal tab list.

`icon` is the id of a [VSCode product icon](https://code.visualstudio.com/api/references/icons-in-labels). Some useful ones:

| Icon             | Good for                    |
| ---------------- | --------------------------- |
| `server-process` | a dev server or API         |
| `browser`        | a frontend / client watcher |
| `beaker`         | tests                       |
| `tools`          | builds and linting          |
| `database`       | a database or cache         |
| `gear`           | background workers          |
| `terminal-bash`  | a plain scratch shell       |

`color` is the id of a [VSCode theme colour](https://code.visualstudio.com/api/references/theme-color#integrated-terminal-colors), and tints the terminal's icon. Stick to the `terminal.ansi*` keys, which VSCode recommends because they stay readable in both light and dark themes:

`terminal.ansiRed`, `terminal.ansiGreen`, `terminal.ansiYellow`, `terminal.ansiBlue`, `terminal.ansiMagenta`, `terminal.ansiCyan`, `terminal.ansiWhite`, `terminal.ansiBlack`, plus a `terminal.ansiBright*` variant of each.

Both are optional; leave them out and you get VSCode's default terminal icon.

### Per-terminal shell and environment

Each split can also override how its shell is launched:

| Option      | What it does                                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `cwd`       | Working directory for this split only, overriding the terminal window's `cwd`. Supports the same `${workspaceFolder}` variables. |
| `env`       | Environment variables for this split, on top of what it would normally inherit. Set a value to `null` to remove that variable.   |
| `shellPath` | Path to a specific shell executable, instead of your default terminal shell.                                                     |
| `shellArgs` | Arguments for that shell, as an array or a single string.                                                                        |

```json
{
  "name": "deploy",
  "icon": "rocket",
  "color": "terminal.ansiRed",
  "cwd": "${workspaceFolder:infra}",
  "shellPath": "/bin/bash",
  "shellArgs": ["-l"],
  "env": { "AWS_PROFILE": "staging", "NODE_OPTIONS": null },
  "commands": ["terraform plan"]
}
```

### Settings

| Setting                                        | Default | What it does                                                                                       |
| ---------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `restoreTerminals.runOnStartup`                | `true`  | Restore terminals when VSCode opens. Set to `false` to only ever restore from the command palette. |
| `restoreTerminals.keepExistingTerminalsOpen`   | `false` | Leave already-open terminals alone instead of closing them first.                                  |
| `restoreTerminals.artificialDelayMilliseconds` | unset   | A fixed pause between every step. See below; you should not normally need it.                      |

You can restore at any time by running **Restore Terminals** from the command palette.

Per split, `shouldRunCommands: false` pastes the commands into the terminal without executing them. And if you don't want splits at all, put a single object in each `splitTerminals` array.

### Timing

Restore Terminals waits for each shell to actually finish starting before sending its commands, and does that for every terminal at once, so restoration is normally near-instant.

Older versions instead slept for a fixed delay between every step. If your setup glitches out or runs commands in the wrong terminal, set `restoreTerminals.artificialDelayMilliseconds` to a number of milliseconds to bring that pause back.

## Contributions

Contributions are welcome. Because the behaviour here depends on real terminal timing that unit tests cannot cover, please describe how you verified your change in a real VSCode window. A short screen recording is ideal for anything touching terminal creation, splitting or command execution.

Run `pnpm test` (typecheck, lint and unit tests) before opening a PR. See [vsc-extension-quickstart.md](vsc-extension-quickstart.md) for how to build and try the extension against `sample-test-project`.

Thanks to everyone who has contributed:

<a href="https://github.com/KasperiP/vscode-restore-terminals/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=KasperiP/vscode-restore-terminals" alt="Contributors" />
</a>

## Credits

Original extension by [Ethan Sarif-Kattan](https://github.com/EthanSK) at [EthanSK/restore-terminals-vscode](https://github.com/EthanSK/restore-terminals-vscode). All of the original design and the great majority of the ideas here are his work; this fork exists to keep it maintained, not to replace it. Please star the original repository if this extension is useful to you.

**Enjoy!**
