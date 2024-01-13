import { buildClient, buildServer } from "@dtrlanz/gas-bundler";

buildServer({
    entryPoints: ['server.ts'],
    outdir: 'out',
    format: 'cjs',
    target: 'es2019',
});

buildClient({
    entryPoints: ['client.html'],
    outdir: 'out',
    format: 'cjs',
    target: 'es2022',
});