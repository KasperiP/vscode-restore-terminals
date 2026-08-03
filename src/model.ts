export interface TerminalConfig {
  commands?: string[];
  name?: string;
  icon?: string; //id of a VSCode product icon, e.g. "terminal-bash"
  color?: string; //id of a VSCode theme colour, e.g. "terminal.ansiGreen"
  cwd?: string; //overrides the terminal window's cwd for this split only
  env?: Record<string, string | null>; //null removes a variable from the environment
  shellPath?: string; //run this split under a specific shell
  shellArgs?: string[] | string;
  shouldRunCommands?: boolean; //whether to actually run the commands, or just paste them in
}

export interface TerminalWindow {
  cwd?: string;
  splitTerminals?: TerminalConfig[];
}

export interface Configuration {
  keepExistingTerminalsOpen?: boolean;
  artificialDelayMilliseconds?: number;
  terminalWindows?: TerminalWindow[];
  runOnStartup?: boolean;
}

export interface JsonConfiguration {
  keepExistingTerminalsOpen?: boolean;
  artificialDelayMilliseconds?: number;
  terminals?: TerminalWindow[]; //uses same type for now
  runOnStartup?: boolean;
}
