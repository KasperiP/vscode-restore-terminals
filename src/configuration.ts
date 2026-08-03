import * as path from 'node:path';
import * as vscode from 'vscode';
import type {
  Configuration,
  JsonConfiguration,
  TerminalWindow,
} from './model.ts';

const CONFIG_FILE_RELATIVE_PATH = ['.vscode', 'restore-terminals.json'];

export async function getConfiguration(): Promise<Configuration> {
  const settings = vscode.workspace.getConfiguration('restoreTerminals');
  const configFromFile = await getConfigurationFromJsonFile();

  return {
    keepExistingTerminalsOpen:
      configFromFile?.keepExistingTerminalsOpen ??
      settings.get<boolean>('keepExistingTerminalsOpen'),
    artificialDelayMilliseconds:
      configFromFile?.artificialDelayMilliseconds ??
      settings.get<number>('artificialDelayMilliseconds'),
    terminalWindows:
      configFromFile?.terminals ?? settings.get<TerminalWindow[]>('terminals'),
    runOnStartup:
      configFromFile?.runOnStartup ?? settings.get<boolean>('runOnStartup'),
  };
}

async function getConfigurationFromJsonFile(): Promise<
  JsonConfiguration | undefined
> {
  const { workspaceFolders } = vscode.workspace;
  if (!workspaceFolders) return undefined;

  //use the first workspace that has a config file
  for (const folder of workspaceFolders) {
    const configFilePath = vscode.Uri.file(
      path.join(folder.uri.fsPath, ...CONFIG_FILE_RELATIVE_PATH),
    );

    let fileData: Uint8Array;
    try {
      fileData = await vscode.workspace.fs.readFile(configFilePath);
    } catch {
      continue; //no config file in this workspace folder, which is the normal case
    }

    return JSON.parse(new TextDecoder().decode(fileData)) as JsonConfiguration;
  }

  return undefined;
}
