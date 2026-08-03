# Change Log

Versions up to and including 1.1.9 are from the original [Restore Terminals](https://github.com/EthanSK/restore-terminals-vscode) by Ethan Sarif-Kattan. From 1.2.3 onwards this is the community fork.

## 1.2.5

- Marketplace listing only, no functional changes: a fuller description, more search keywords, a dark gallery banner, the Q&A tab enabled, and a new icon. The settings section is now titled "Restore Terminals" instead of "Restore Terminals Config".

## 1.2.3

- First release of the community fork, published as `KasperiP.vscode-restore-terminals`. Your existing `restoreTerminals.*` settings and `.vscode/restore-terminals.json` work unchanged, but **uninstall the original extension first** — both register the same command and having both enabled will break one of them.

- **Requires VSCode 1.125.0 or newer.**
- Split terminals are now created with the supported `parentTerminal` API instead of firing the terminal-split command and polling until a new terminal appeared. Splitting and naming should be more reliable.
- Added `icon` and `color` options for terminal customization. `icon` takes a [product icon id](https://code.visualstudio.com/api/references/icons-in-labels) such as `"server-process"`; `color` takes a [theme colour id](https://code.visualstudio.com/api/references/theme-color#integrated-terminal-colors) such as `"terminal.ansiGreen"`. Both apply per split terminal, not just to the first one in a group. `icon` had been documented in the settings schema but never implemented.
- Fixed: a terminal window with no `splitTerminals` no longer stops every later window from being restored.
- Fixed: existing terminals are now closed when `keepExistingTerminalsOpen` is `false` even if no terminal is currently focused.
- Fixed: in a multi-root workspace, `.vscode/restore-terminals.json` is now read from the first workspace folder that has one, instead of the last.
- **Much faster.** Restoration used to sleep for a fixed delay after every single step. It now waits for each shell to actually start, for all terminals at once, so a typical config restores in a fraction of the time. `artificialDelayMilliseconds` is now unset by default and kept only as an escape hatch — set it to a number to get the old pacing back.
- Commands are now run through [shell integration](https://code.visualstudio.com/docs/terminal/shell-integration) when the shell supports it, which is more reliable than typing them into the terminal buffer. Falls back to the old behaviour otherwise, and `shouldRunCommands: false` still just pastes.
- Added per-split `cwd`, `env`, `shellPath` and `shellArgs`, so a single terminal window can hold splits in different directories or under different shells.
- Added a JSON schema for `.vscode/restore-terminals.json`, so that file now gets completion and validation while you edit it.
- Fixed: a `restore-terminals.json` with a syntax error now reports the error instead of silently falling back to `settings.json`. Config values with the wrong type are now reported too, naming the exact field, rather than causing an unrelated failure later.
- Fixed: errors during restoration — including the "workspace folder is not available" failure — are now shown to you. They were previously lost to an unhandled rejection, so restoration just did nothing with no explanation.
- Extension logs now go to Output > Restore Terminals instead of the extension host console.
- The extension is now bundled and has no runtime dependencies (the deprecated `text-encoding` package is gone).

## 1.1.9

- Added a terminal-window `cwd` option with named multi-root workspace-folder resolution.
- Invalid or ambiguous workspace-folder paths now fail before existing terminals are closed.

## 1.1.6

- Added ability to prevent commands running, just pastes them there, as per [this feature request](https://github.com/EthanSK/restore-terminals-vscode/issues/11#issuecomment-834582672).

## [Unreleased]

- Initial release
