import * as assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { resolveTerminalCwd } from '../../terminalCwd.ts';

suite('Terminal cwd', () => {
  test('resolves a named workspace folder without following the active editor', () => {
    const folders = [
      {
        name: 'ai-music-video-studio',
        fsPath: '/projects/ai-music-video-studio',
      },
      {
        name: 'ai-music-video-studio-feature',
        fsPath: '/projects/ai-music-video-studio-feature',
      },
    ];

    assert.equal(
      resolveTerminalCwd('${workspaceFolder:ai-music-video-studio}', folders),
      '/projects/ai-music-video-studio',
    );
  });

  test('resolves a path below a named workspace folder', () => {
    const folders = [{ name: 'main', fsPath: '/projects/main' }];

    assert.equal(
      resolveTerminalCwd('${workspaceFolder:main}/apps/api', folders),
      '/projects/main/apps/api',
    );
  });

  test('rejects an ambiguous unnamed workspace folder', () => {
    const folders = [
      { name: 'main', fsPath: '/projects/main' },
      { name: 'feature', fsPath: '/projects/feature' },
    ];

    assert.throws(
      () => resolveTerminalCwd('${workspaceFolder}', folders),
      /only workspace folder/,
    );
  });

  test('rejects a missing named workspace folder', () => {
    const folders = [{ name: 'feature', fsPath: '/projects/feature' }];

    assert.throws(
      () => resolveTerminalCwd('${workspaceFolder:main}', folders),
      /named "main" is not available/,
    );
  });

  test('preserves an explicit cwd', () => {
    assert.equal(resolveTerminalCwd('/projects/main', []), '/projects/main');
  });
});
