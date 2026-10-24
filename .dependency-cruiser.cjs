/**
 * Architectural boundaries checked on the resolved import graph (see docs/adr/0008).
 * Run with `pnpm lint:deps`.
 */
const PRODUCTION_SOURCE = '^(apps|packages)/[^/]+/src/'
const NOT_PRODUCTION = '\\.(test|stories|bench)\\.tsx?$|/test-setup\\.ts$|\\.d\\.ts$'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Cycles make modules impossible to reason about, test or extract in isolation.',
      severity: 'error',
      from: {},
      to: { circular: true }
    },
    {
      name: 'not-to-unresolvable',
      comment: 'Every import must resolve to a file or a declared package.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true }
    },
    {
      name: 'no-non-package-json',
      comment: 'Packages must be declared in the package.json of the workspace that imports them.',
      severity: 'error',
      from: {},
      to: {
        dependencyTypes: ['npm-no-pkg', 'npm-unknown'],
        dependencyTypesNot: ['npm', 'npm-dev', 'npm-peer', 'npm-optional']
      }
    },
    {
      name: 'not-to-dev-dep',
      comment: 'Production code must not import devDependencies (they are absent at runtime).',
      severity: 'error',
      from: { path: PRODUCTION_SOURCE, pathNot: NOT_PRODUCTION },
      to: {
        dependencyTypes: ['npm-dev'],
        dependencyTypesNot: ['type-only', 'npm-peer'],
        pathNot: ['node_modules/@types/']
      }
    },
    {
      name: 'api-domain-is-pure',
      comment: 'Domain code holds the rules: no HTTP, persistence, adapters, logging, use cases or wiring.',
      severity: 'error',
      from: { path: '^apps/api/src/modules/[^/]+/domain/' },
      to: {
        path: [
          '^apps/api/src/(app|config)/',
          '^apps/api/src/libs/(http|db|log|adapters)/',
          '^apps/api/src/modules/[^/]+/(database|infrastructure|application|commands|queries)/'
        ]
      }
    },
    {
      name: 'api-domain-no-io-builtins',
      comment: 'Domain code does no I/O and draws no randomness (ids and "now" are passed in).',
      severity: 'error',
      from: { path: '^apps/api/src/modules/[^/]+/domain/' },
      to: {
        dependencyTypes: ['core'],
        path: '^(node:)?(http|https|http2|net|dgram|fs|fs/promises|child_process|worker_threads|crypto|os|perf_hooks)$'
      }
    },
    {
      name: 'api-modules-talk-through-index',
      comment: "A module reaches another only through that module's public index.ts.",
      severity: 'error',
      from: { path: '^apps/api/src/modules/([^/]+)/', pathNot: NOT_PRODUCTION },
      to: {
        path: '^apps/api/src/modules/',
        pathNot: ['^apps/api/src/modules/$1/', '^apps/api/src/modules/[^/]+/index\\.ts$']
      }
    },
    {
      name: 'api-use-cases-depend-on-ports',
      comment: 'Use cases and controllers depend on ports (*.port.ts), never on repositories or adapters.',
      severity: 'error',
      from: {
        path: '^apps/api/src/modules/[^/]+/(commands|queries|application)/',
        pathNot: NOT_PRODUCTION
      },
      to: {
        path: ['^apps/api/src/modules/[^/]+/(database|infrastructure)/', '^apps/api/src/libs/(db|adapters)/'],
        pathNot: '\\.port\\.ts$'
      }
    },
    {
      name: 'api-modules-not-to-app',
      comment: 'The composition root (app/) knows the modules, never the other way round: no service locator.',
      severity: 'error',
      from: { path: '^apps/api/src/modules/' },
      to: { path: '^apps/api/src/(app/|main\\.ts$)' }
    },
    {
      name: 'api-libs-are-generic',
      comment: 'libs/ is infrastructure without business knowledge: it must not import modules or app.',
      severity: 'error',
      from: { path: '^apps/api/src/libs/' },
      to: { path: '^apps/api/src/(modules|app)/' }
    },
    {
      name: 'web-fsd-shared',
      comment: 'FSD: shared/ imports nothing above it.',
      severity: 'error',
      from: { path: '^apps/web/src/shared/' },
      to: { path: '^apps/web/src/(entities|features|widgets|pages|app)/' }
    },
    {
      name: 'web-fsd-entities',
      comment: 'FSD: entities/ may import only shared/.',
      severity: 'error',
      from: { path: '^apps/web/src/entities/' },
      to: { path: '^apps/web/src/(features|widgets|pages|app)/' }
    },
    {
      name: 'web-fsd-features',
      comment: 'FSD: features/ may import only entities/ and shared/.',
      severity: 'error',
      from: { path: '^apps/web/src/features/' },
      to: { path: '^apps/web/src/(widgets|pages|app)/' }
    },
    {
      name: 'web-fsd-widgets',
      comment: 'FSD: widgets/ may import only features/, entities/ and shared/.',
      severity: 'error',
      from: { path: '^apps/web/src/widgets/' },
      to: { path: '^apps/web/src/(pages|app)/' }
    },
    {
      name: 'web-fsd-pages',
      comment: 'FSD: pages/ must not import app/.',
      severity: 'error',
      from: { path: '^apps/web/src/pages/' },
      to: { path: '^apps/web/src/app/' }
    },
    {
      name: 'web-fsd-no-cross-slice',
      comment: 'FSD: slices of the same layer do not import each other.',
      severity: 'error',
      from: { path: '^apps/web/src/(entities|features|widgets|pages)/([^/]+)/' },
      to: { path: '^apps/web/src/$1/', pathNot: '^apps/web/src/$1/$2/' }
    },
    {
      name: 'web-fsd-public-api',
      comment: 'A slice is reached only through its index.ts, never through its internals.',
      severity: 'error',
      from: {
        path: '^apps/web/src/(entities|features|widgets|pages|shared)/([^/]+)/',
        pathNot: NOT_PRODUCTION
      },
      to: {
        path: '^apps/web/src/(entities|features|widgets|pages|shared)/[^/]+/',
        pathNot: ['^apps/web/src/$1/$2/', '^apps/web/src/[^/]+/[^/]+/index\\.ts$']
      }
    },
    {
      name: 'web-fsd-public-api-from-app',
      comment: 'app/ and main.tsx also reach slices only through their index.ts.',
      severity: 'error',
      from: { path: '^apps/web/src/(app/|main\\.tsx$)' },
      to: {
        path: '^apps/web/src/(entities|features|widgets|pages|shared)/[^/]+/',
        pathNot: '^apps/web/src/[^/]+/[^/]+/index\\.ts$'
      }
    },
    {
      name: 'packages-not-to-apps',
      comment: 'Packages are consumed by apps, never the other way round.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' }
    }
  ],
  options: {
    doNotFollow: { path: ['node_modules'] },
    exclude: { path: '^(apps|packages)/[^/]+/dist/|^coverage/' },
    // TypeScript 7 ships no JS compiler API yet; swc parses TS (type-only imports included).
    parser: 'swc',
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings']
    },
    reporterOptions: {
      text: { highlightFocused: true }
    }
  }
}
