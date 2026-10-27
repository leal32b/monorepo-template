import { rmSync } from 'node:fs'
import { build } from 'esbuild'

/**
 * Production bundle (ADR 0012): one self-contained ESM file per entry point, so the image needs
 * no node_modules. Run with `node build.ts`; Node strips the types.
 */
const root = import.meta.dirname

// Start clean so a removed entry point never leaves a stale file behind.
rmSync(`${root}/dist`, { recursive: true, force: true })

await build({
  absWorkingDir: root,
  entryPoints: ['src/main.ts', 'src/migrate.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  sourcemap: true,
  // Optional native add-on that `pg` loads only on request; it is never installed.
  external: ['pg-native'],
  // Bundled CommonJS dependencies (pg, pino) call `require`, which ESM does not define.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info'
})
