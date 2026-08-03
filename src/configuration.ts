import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  mergeConfiguration,
  parseJsonConfiguration,
  parseTerminalWindows,
} from './configValidation.ts';
import { getLogger, reportError } from './log.ts';
import type {
  Configuration,
  JsonConfiguration,
  TerminalWindow,
} from './model.ts';

const CONFIG_FILE_RELATIVE_PATH = ['.vscode', 'restore-terminals.json'];

export async function getConfiguration(): Promise<Configuration> {
  const settings = vscode.workspace.getConfiguration('restoreTerminals');

  let terminalWindows: TerminalWindow[] | undefined;
  try {
    terminalWindows = parseTerminalWindows(
      settings.get('terminals'),
      'restoreTerminals.terminals',
    );
  } catch (error) {
    reportError('Restore Terminals found an invalid setting', error);
  }

  return mergeConfiguration(await getConfigurationFromJsonFile(), {
    keepExistingTerminalsOpen: settings.get<boolean>(
      'keepExistingTerminalsOpen',
    ),
    artificialDelayMilliseconds: settings.get<number>(
      'artificialDelayMilliseconds',
    ),
    terminalWindows,
    runOnStartup: settings.get<boolean>('runOnStartup'),
  });
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

    // A file that exists but is malformed is a user mistake worth surfacing,
    // rather than silently falling through to settings.json.
    try {
      const config = parseJsonConfiguration(new TextDecoder().decode(fileData));
      getLogger().debug(`Loaded config from ${configFilePath.fsPath}`);
      return config;
    } catch (error) {
      reportError(
        `Restore Terminals could not read ${configFilePath.fsPath}`,
        error,
      );
      return undefined;
    }
  }

  return undefined;
}
