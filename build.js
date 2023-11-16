import { build } from "@dtrlanz/gas-bundler";

build({
    entryPoints: ['src/index.ts', 'src/client.html'],
    outdir: 'out',
    format: 'cjs',
});