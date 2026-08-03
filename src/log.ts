import * as vscode from 'vscode';

let channel: vscode.LogOutputChannel | undefined;

/**
 * A LogOutputChannel is user-visible under Output > Restore Terminals and
 * respects the user's log level, unlike console.log into the extension host.
 */
export function getLogger(): vscode.LogOutputChannel {
  channel ??= vscode.window.createOutputChannel('Restore Terminals', {
    log: true,
  });
  return channel;
}

/** Reports a failure to the user instead of losing it to an unhandled rejection. */
export function reportError(message: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  getLogger().error(`${message}: ${detail}`);
  void vscode.window.showErrorMessage(`${message}: ${detail}`);
}
