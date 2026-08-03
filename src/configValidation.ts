import type {
  Configuration,
  JsonConfiguration,
  TerminalConfig,
  TerminalWindow,
} from './model.ts';

/**
 * Pure parsing, validation and merging for the extension's configuration, kept
 * free of the vscode module so it can be unit tested.
 *
 * Validation exists because a hand-written .vscode/restore-terminals.json used
 * to be cast straight to the config type: a wrong shape surfaced later as an
 * unrelated crash mid-restore rather than as a message naming the bad field.
 */

export class ConfigurationError extends Error {}

function fail(path: string, expected: string, actual: unknown): never {
  throw new ConfigurationError(
    `${path} should be ${expected} but is ${describe(actual)}`,
  );
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') fail(path, 'a string', value);
  return value;
}

function optionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') fail(path, 'a boolean', value);
  return value;
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, 'a number', value);
  }
  return value;
}

function optionalStringArray(
  value: unknown,
  path: string,
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail(path, 'an array of strings', value);
  return value.map((entry, index) => {
    if (typeof entry !== 'string') fail(`${path}[${index}]`, 'a string', entry);
    return entry;
  });
}

function optionalRecord(
  value: unknown,
  path: string,
): Record<string, string | null> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'an object', value);
  }
  const result: Record<string, string | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== null && typeof entry !== 'string') {
      fail(`${path}.${key}`, 'a string or null', entry);
    }
    result[key] = entry as string | null;
  }
  return result;
}

function parseSplitTerminal(value: unknown, path: string): TerminalConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'an object', value);
  }
  const raw = value as Record<string, unknown>;

  const shellArgs =
    typeof raw.shellArgs === 'string'
      ? raw.shellArgs
      : optionalStringArray(raw.shellArgs, `${path}.shellArgs`);

  return {
    name: optionalString(raw.name, `${path}.name`),
    icon: optionalString(raw.icon, `${path}.icon`),
    color: optionalString(raw.color, `${path}.color`),
    cwd: optionalString(raw.cwd, `${path}.cwd`),
    shellPath: optionalString(raw.shellPath, `${path}.shellPath`),
    shellArgs,
    env: optionalRecord(raw.env, `${path}.env`),
    commands: optionalStringArray(raw.commands, `${path}.commands`),
    shouldRunCommands: optionalBoolean(
      raw.shouldRunCommands,
      `${path}.shouldRunCommands`,
    ),
  };
}

function parseTerminalWindow(value: unknown, path: string): TerminalWindow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'an object', value);
  }
  const raw = value as Record<string, unknown>;

  if (raw.splitTerminals !== undefined && !Array.isArray(raw.splitTerminals)) {
    fail(`${path}.splitTerminals`, 'an array', raw.splitTerminals);
  }

  return {
    cwd: optionalString(raw.cwd, `${path}.cwd`),
    splitTerminals: (raw.splitTerminals as unknown[] | undefined)?.map(
      (split, index) =>
        parseSplitTerminal(split, `${path}.splitTerminals[${index}]`),
    ),
  };
}

export function parseTerminalWindows(
  value: unknown,
  path: string,
): TerminalWindow[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) fail(path, 'an array', value);
  return value.map((window, index) =>
    parseTerminalWindow(window, `${path}[${index}]`),
  );
}

/** Parses the contents of a .vscode/restore-terminals.json file. */
export function parseJsonConfiguration(text: string): JsonConfiguration {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ConfigurationError(
      error instanceof Error ? error.message : String(error),
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail('The config file', 'an object', parsed);
  }
  const raw = parsed as Record<string, unknown>;

  return {
    keepExistingTerminalsOpen: optionalBoolean(
      raw.keepExistingTerminalsOpen,
      'keepExistingTerminalsOpen',
    ),
    artificialDelayMilliseconds: optionalNumber(
      raw.artificialDelayMilliseconds,
      'artificialDelayMilliseconds',
    ),
    runOnStartup: optionalBoolean(raw.runOnStartup, 'runOnStartup'),
    terminals: parseTerminalWindows(raw.terminals, 'terminals'),
  };
}

/**
 * The config file wins field by field, so a file that only sets runOnStartup
 * still inherits the terminals from settings.json.
 */
export function mergeConfiguration(
  fromFile: JsonConfiguration | undefined,
  fromSettings: Configuration,
): Configuration {
  return {
    keepExistingTerminalsOpen:
      fromFile?.keepExistingTerminalsOpen ??
      fromSettings.keepExistingTerminalsOpen,
    artificialDelayMilliseconds:
      fromFile?.artificialDelayMilliseconds ??
      fromSettings.artificialDelayMilliseconds,
    terminalWindows: fromFile?.terminals ?? fromSettings.terminalWindows,
    runOnStartup: fromFile?.runOnStartup ?? fromSettings.runOnStartup,
  };
}
