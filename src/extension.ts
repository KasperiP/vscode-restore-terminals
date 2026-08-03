// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getConfiguration } from './configuration.ts';
import restoreTerminals from './restoreTerminals.ts';

// this method is called when your extension is activated
//do NOT await the restoreTerminals calls in this func, or the command just doesn't work
export async function activate(context: vscode.ExtensionContext) {
  console.log('restore-terminals is now active');

  const config = await getConfiguration(); //must be done here so json config works for runOnStartup

  const disposable = vscode.commands.registerCommand(
    'restore-terminals.restoreTerminals',
    async () => {
      void restoreTerminals(await getConfiguration()); //get fresh config here
    },
  );

  context.subscriptions.push(disposable);

  if (config.runOnStartup) {
    void restoreTerminals(config); //run on startup
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
