import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    packages: 'external',
    outdir: 'dist',
    banner: {
        js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
});
