import * as assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import {
  ConfigurationError,
  mergeConfiguration,
  parseJsonConfiguration,
  parseTerminalWindows,
} from '../../configValidation.ts';

suite('parseJsonConfiguration', () => {
  test('parses a full config', () => {
    const config = parseJsonConfiguration(
      JSON.stringify({
        runOnStartup: false,
        keepExistingTerminalsOpen: true,
        artificialDelayMilliseconds: 200,
        terminals: [
          {
            cwd: '/projects/main',
            splitTerminals: [
              {
                name: 'server',
                icon: 'server-process',
                color: 'terminal.ansiGreen',
                cwd: '/projects/main/api',
                shellPath: '/bin/zsh',
                shellArgs: ['-l'],
                env: { NODE_ENV: 'development', UNSET_ME: null },
                commands: ['npm run dev'],
                shouldRunCommands: false,
              },
            ],
          },
        ],
      }),
    );

    assert.equal(config.runOnStartup, false);
    assert.equal(config.artificialDelayMilliseconds, 200);
    const split = config.terminals?.[0].splitTerminals?.[0];
    assert.equal(split?.cwd, '/projects/main/api');
    assert.equal(split?.color, 'terminal.ansiGreen');
    assert.deepEqual(split?.env, { NODE_ENV: 'development', UNSET_ME: null });
    assert.deepEqual(split?.shellArgs, ['-l']);
    assert.equal(split?.shouldRunCommands, false);
  });

  test('accepts a minimal config', () => {
    assert.deepEqual(parseJsonConfiguration('{}'), {
      keepExistingTerminalsOpen: undefined,
      artificialDelayMilliseconds: undefined,
      runOnStartup: undefined,
      terminals: undefined,
    });
  });

  test('accepts shellArgs as a single string', () => {
    const config = parseJsonConfiguration(
      '{"terminals":[{"splitTerminals":[{"shellArgs":"-l"}]}]}',
    );
    assert.equal(config.terminals?.[0].splitTerminals?.[0].shellArgs, '-l');
  });

  test('reports a syntax error rather than throwing a raw SyntaxError', () => {
    assert.throws(
      () => parseJsonConfiguration('{ oops }'),
      (error: unknown) => error instanceof ConfigurationError,
    );
  });

  test('names the offending field when a value has the wrong type', () => {
    assert.throws(
      () => parseJsonConfiguration('{"terminals":"oops"}'),
      /terminals should be an array but is a string/,
    );
  });

  test('names the offending field deep inside the tree', () => {
    assert.throws(
      () =>
        parseJsonConfiguration(
          '{"terminals":[{"splitTerminals":[{"commands":[1]}]}]}',
        ),
      /terminals\[0\]\.splitTerminals\[0\]\.commands\[0\] should be a string but is a number/,
    );
  });

  test('rejects a non-object env value', () => {
    assert.throws(
      () =>
        parseJsonConfiguration(
          '{"terminals":[{"splitTerminals":[{"env":{"A":1}}]}]}',
        ),
      /env\.A should be a string or null but is a number/,
    );
  });

  test('parses an editor-area terminal window', () => {
    const config = parseJsonConfiguration(
      '{"terminals":[{"location":"editor","splitTerminals":[{"name":"logs"}]}]}',
    );

    assert.equal(config.terminals?.[0].location, 'editor');
  });

  test('leaves location unset when it is not configured', () => {
    const config = parseJsonConfiguration(
      '{"terminals":[{"splitTerminals":[{"name":"logs"}]}]}',
    );

    assert.equal(config.terminals?.[0].location, undefined);
  });

  test('rejects an unknown location, echoing the typo', () => {
    assert.throws(
      () => parseJsonConfiguration('{"terminals":[{"location":"panels"}]}'),
      /terminals\[0\]\.location should be "panel" or "editor" but is "panels"/,
    );
  });

  test('rejects a location that is not a string', () => {
    assert.throws(
      () => parseJsonConfiguration('{"terminals":[{"location":2}]}'),
      /terminals\[0\]\.location should be "panel" or "editor" but is a number/,
    );
  });

  test('rejects a top level array', () => {
    assert.throws(
      () => parseJsonConfiguration('[]'),
      /The config file should be an object but is an array/,
    );
  });
});

suite('parseTerminalWindows', () => {
  test('treats null and undefined as absent', () => {
    assert.equal(parseTerminalWindows(undefined, 'terminals'), undefined);
    assert.equal(parseTerminalWindows(null, 'terminals'), undefined);
  });

  test('rejects a window that is not an object', () => {
    assert.throws(
      () => parseTerminalWindows(['nope'], 'terminals'),
      /terminals\[0\] should be an object but is a string/,
    );
  });
});

suite('mergeConfiguration', () => {
  const settings = {
    keepExistingTerminalsOpen: false,
    artificialDelayMilliseconds: 150,
    runOnStartup: true,
    terminalWindows: [{ cwd: '/from/settings' }],
  };

  test('falls back to settings when there is no config file', () => {
    assert.deepEqual(mergeConfiguration(undefined, settings), {
      keepExistingTerminalsOpen: false,
      artificialDelayMilliseconds: 150,
      runOnStartup: true,
      terminalWindows: [{ cwd: '/from/settings' }],
    });
  });

  test('lets the config file win field by field', () => {
    const merged = mergeConfiguration({ runOnStartup: false }, settings);

    assert.equal(merged.runOnStartup, false);
    // Untouched fields still come from settings.json.
    assert.deepEqual(merged.terminalWindows, [{ cwd: '/from/settings' }]);
    assert.equal(merged.artificialDelayMilliseconds, 150);
  });

  test('maps the config file terminals key onto terminalWindows', () => {
    const merged = mergeConfiguration(
      { terminals: [{ cwd: '/from/file' }] },
      settings,
    );

    assert.deepEqual(merged.terminalWindows, [{ cwd: '/from/file' }]);
  });

  test('lets an explicit false in the config file win over a true setting', () => {
    const merged = mergeConfiguration(
      { keepExistingTerminalsOpen: false },
      {
        ...settings,
        keepExistingTerminalsOpen: true,
      },
    );

    assert.equal(merged.keepExistingTerminalsOpen, false);
  });
});
