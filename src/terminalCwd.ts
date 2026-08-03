import * as path from 'node:path';

export interface WorkspaceFolderForCwd {
  name: string;
  fsPath: string;
}

const WORKSPACE_FOLDER_VARIABLE = /^\$\{workspaceFolder(?::([^}]+))?\}(.*)$/;

/**
 * Resolves VS Code-style workspace-folder variables used by terminal-window cwd.
 * A named folder is required in multi-root workspaces so restoration cannot
 * silently follow whichever editor or worktree happens to be active.
 */
export function resolveTerminalCwd(
  configuredCwd: string | undefined,
  workspaceFolders: readonly WorkspaceFolderForCwd[] | undefined,
): string | undefined {
  if (!configuredCwd) return undefined;

  const variableMatch = WORKSPACE_FOLDER_VARIABLE.exec(configuredCwd);
  if (!variableMatch) return configuredCwd;

  const requestedFolderName = variableMatch[1];
  const folders = workspaceFolders ?? [];
  const workspaceFolder = requestedFolderName
    ? folders.find(
        (folder) =>
          folder.name === requestedFolderName ||
          path.basename(folder.fsPath) === requestedFolderName,
      )
    : folders.length === 1
      ? folders[0]
      : undefined;

  if (!workspaceFolder) {
    const requestedFolderDescription = requestedFolderName
      ? `named "${requestedFolderName}"`
      : 'the only workspace folder';
    throw new Error(
      `Restore Terminals could not resolve ${configuredCwd}: ${requestedFolderDescription} is not available.`,
    );
  }

  const relativeSuffix = variableMatch[2].replace(/^[/\\]+/, '');
  return relativeSuffix
    ? path.resolve(workspaceFolder.fsPath, relativeSuffix)
    : workspaceFolder.fsPath;
}
