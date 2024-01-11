import { buildClient, buildServer } from "@dtrlanz/gas-bundler";

buildServer({
    entryPoints: ['test/clasp/server.ts'],
    outdir: '../out/clasp',
    format: 'cjs',
    target: 'es2019',
});

buildClient({
    entryPoints: ['test/clasp/client.html'],
    outdir: '../out/clasp',
    format: 'cjs',
    target: 'es2022',
});