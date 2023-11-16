import { build } from "@dtrlanz/gas-bundler";

build({
    entryPoints: ['src/index.ts'],
    outdir: 'out',
    format: 'cjs',
});