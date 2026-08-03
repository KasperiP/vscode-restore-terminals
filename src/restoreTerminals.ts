import { setTimeout as delay } from 'node:timers/promises';
import * as vscode from 'vscode';
import type { Configuration, TerminalConfig, TerminalWindow } from './model.ts';
import {
  resolveTerminalCwd,
  type WorkspaceFolderForCwd,
} from './terminalCwd.ts';

/** How long to wait for a shell to actually spawn before giving up on it. */
const PROCESS_START_TIMEOUT = 10_000;
/** Shell integration is optional; never block restoration on it for long. */
const SHELL_INTEGRATION_TIMEOUT = 5_000;

interface PlannedTerminal {
  config: TerminalConfig;
  cwd: string | undefined;
}

interface CreatedTerminal {
  config: TerminalConfig;
  terminal: vscode.Terminal;
}

export default async function restoreTerminals(configuration: Configuration) {
  const {
    keepExistingTerminalsOpen,
    artificialDelayMilliseconds,
    terminalWindows,
  } = configuration;

  if (!terminalWindows) {
    console.log('No terminal window configuration to restore');
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => ({
    name: folder.name,
    fsPath: folder.uri.fsPath,
  }));

  // Resolve every configured cwd before disposing an existing terminal. A typo
  // or missing named workspace folder must fail closed without destroying the
  // user's current terminal layout.
  const plan = planTerminals(terminalWindows, workspaceFolders);
  if (plan.length === 0) {
    console.log('Nothing to restore');
    return;
  }

  if (!keepExistingTerminalsOpen) {
    for (const terminal of vscode.window.terminals) {
      console.log(`Disposing terminal ${terminal.name}`);
      terminal.dispose();
    }
  }

  // Creating a terminal is a direct API call now, so no pacing is needed between
  // steps. artificialDelayMilliseconds stays as an escape hatch for anyone whose
  // setup still needs the old behaviour.
  const stepDelay = artificialDelayMilliseconds ?? 0;
  if (stepDelay > 0) await delay(stepDelay);

  const created: CreatedTerminal[] = [];
  for (const splits of plan) {
    const [first, ...remaining] = splits;

    const parentTerminal = vscode.window.createTerminal(
      terminalOptionsFor(first),
    );
    parentTerminal.show();
    created.push({ config: first.config, terminal: parentTerminal });
    if (stepDelay > 0) await delay(stepDelay);

    for (const split of remaining) {
      created.push({
        config: split.config,
        terminal: vscode.window.createTerminal({
          ...terminalOptionsFor(split),
          location: { parentTerminal },
        }),
      });
      if (stepDelay > 0) await delay(stepDelay);
    }
  }

  // Wait for the shells to actually be up rather than guessing with a sleep.
  // Every terminal is waited on concurrently, so this costs one shell start.
  await Promise.all(created.map(({ terminal }) => waitForProcess(terminal)));

  await Promise.all(
    created.map(async ({ config, terminal }) => {
      if (!config.commands?.length) return;
      const shellIntegration = await waitForShellIntegration(terminal);
      runCommands(config.commands, terminal, config, shellIntegration);
    }),
  );

  console.log(`Restored ${created.length} terminals`);
}

/**
 * A split inherits its window's cwd unless it sets its own. Windows with no
 * splits are dropped here so one empty entry cannot affect the others.
 */
function planTerminals(
  terminalWindows: readonly TerminalWindow[],
  workspaceFolders: readonly WorkspaceFolderForCwd[] | undefined,
): PlannedTerminal[][] {
  return terminalWindows
    .map((terminalWindow) => {
      const windowCwd = resolveTerminalCwd(
        terminalWindow.cwd,
        workspaceFolders,
      );
      return (terminalWindow.splitTerminals ?? []).map((config) => ({
        config,
        cwd: config.cwd
          ? resolveTerminalCwd(config.cwd, workspaceFolders)
          : windowCwd,
      }));
    })
    .filter((splits) => splits.length > 0);
}

/**
 * Icon and colour are applied per split terminal, since every split is its own
 * createTerminal call rather than a terminal-split command.
 */
function terminalOptionsFor({
  config,
  cwd,
}: PlannedTerminal): vscode.TerminalOptions {
  return {
    name: config.name,
    cwd,
    shellPath: config.shellPath,
    shellArgs: config.shellArgs,
    env: config.env,
    iconPath: config.icon ? new vscode.ThemeIcon(config.icon) : undefined,
    // The terminal.ansi* theme keys are what VSCode recommends here; they keep
    // contrast sane across light and dark themes.
    color: config.color ? new vscode.ThemeColor(config.color) : undefined,
  };
}

/** Resolves once the shell process exists, or after a timeout. */
async function waitForProcess(terminal: vscode.Terminal) {
  const timedOut = Symbol('timeout');
  const result = await Promise.race([
    terminal.processId,
    delay(PROCESS_START_TIMEOUT, timedOut),
  ]);
  if (result === timedOut) {
    console.warn(`Terminal ${terminal.name} did not start in time`);
  }
}

/**
 * Shell integration activates asynchronously and never arrives for some shells,
 * so this is a bounded wait that resolves to undefined rather than failing.
 */
async function waitForShellIntegration(
  terminal: vscode.Terminal,
): Promise<vscode.TerminalShellIntegration | undefined> {
  if (terminal.shellIntegration) return terminal.shellIntegration;

  return new Promise((resolve) => {
    const subscription = vscode.window.onDidChangeTerminalShellIntegration(
      (event) => {
        if (event.terminal !== terminal) return;
        subscription.dispose();
        resolve(event.shellIntegration);
      },
    );
    void delay(SHELL_INTEGRATION_TIMEOUT).then(() => {
      subscription.dispose();
      resolve(undefined);
    });
  });
}

function runCommands(
  commands: string[],
  terminal: vscode.Terminal,
  { shouldRunCommands = true }: TerminalConfig,
  shellIntegration: vscode.TerminalShellIntegration | undefined,
) {
  for (const command of commands) {
    if (shouldRunCommands && shellIntegration) {
      // Runs the command as a real shell execution the terminal reports on,
      // instead of typing characters into the buffer and hoping.
      shellIntegration.executeCommand(command);
    } else {
      //add semicolon so all commands can run properly after user presses enter
      terminal.sendText(
        command + (shouldRunCommands ? '' : ';'),
        shouldRunCommands,
      );
    }
  }
}
