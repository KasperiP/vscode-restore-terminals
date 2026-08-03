// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getConfiguration } from './configuration.ts';
import { getLogger, reportError } from './log.ts';
import restoreTerminals from './restoreTerminals.ts';

/**
 * Restoration is deliberately not awaited by its callers, so every failure has
 * to be caught here. resolveTerminalCwd in particular throws on purpose so a
 * bad workspace folder cannot silently destroy the user's terminal layout, and
 * that error is only useful if the user actually sees it.
 */
function restoreTerminalsReportingErrors(
  configuration: Awaited<ReturnType<typeof getConfiguration>>,
) {
  restoreTerminals(configuration).catch((error: unknown) => {
    reportError('Restore Terminals failed', error);
  });
}

// this method is called when your extension is activated
//do NOT await the restoreTerminals calls in this func, or the command just doesn't work
export async function activate(context: vscode.ExtensionContext) {
  const log = getLogger();
  context.subscriptions.push(log);
  log.info('restore-terminals is now active');

  const config = await getConfiguration(); //must be done here so json config works for runOnStartup

  const disposable = vscode.commands.registerCommand(
    'restore-terminals.restoreTerminals',
    async () => {
      try {
        restoreTerminalsReportingErrors(await getConfiguration()); //get fresh config here
      } catch (error) {
        reportError(
          'Restore Terminals could not read its configuration',
          error,
        );
      }
    },
  );

  context.subscriptions.push(disposable);

  if (config.runOnStartup) {
    restoreTerminalsReportingErrors(config); //run on startup
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
