import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
// Only vscode:prepublish passes this. Local builds stay readable and debuggable.
const production = process.argv.includes('--production');

/** Lets the VSCode task system know when a watch rebuild starts and finishes. */
const watchLogPlugin = {
  name: 'watch-log',
  setup(build) {
    build.onStart(() => console.log('[watch] build started'));
    build.onEnd(() => console.log('[watch] build finished'));
  },
};

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  outfile: 'out/extension.cjs',
  bundle: true,
  platform: 'node',
  // The extension host loads `main` with require, so the bundle stays CommonJS
  // even though the sources are ESM.
  format: 'cjs',
  target: 'node22',
  // Provided by the extension host, never bundled.
  external: ['vscode'],
  // Without these, breakpoints in src/*.ts do not bind when debugging with F5.
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  plugins: watch ? [watchLogPlugin] : [],
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
} else {
  await esbuild.build(options);
}
