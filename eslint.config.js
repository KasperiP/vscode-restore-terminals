import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Root config files sit outside the tsconfig project, so the type-aware
  // parser cannot resolve them.
  { ignores: ['out', '.vscode-test', '*.config.js', '*.config.mjs'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // node:test's suite()/test() return promises the runner owns; awaiting them
    // is not how the API is meant to be used.
    files: ['src/test/**/*.ts'],
    rules: { '@typescript-eslint/no-floating-promises': 'off' },
  },
  // Must come last so formatting rules win over any stylistic rules above.
  prettier,
);
