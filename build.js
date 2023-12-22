import { build } from "@dtrlanz/gas-bundler";

build({
    entryPoints: ['test/clasp/server.ts', 'test/clasp/client.html'],
    outdir: 'out/clasp',
    format: 'cjs',
});