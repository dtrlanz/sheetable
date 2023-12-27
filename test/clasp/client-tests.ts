import { test } from "./test";
import { SF } from "./server-fns";
import { server as _server, TypedServer } from "./server-proxy";

const server = _server as TypedServer<SF>;

test('passing test', t => {
    t.is(4, 4);
    t.assert(true);
    t.is(5, 5);
});

test('failing test', t => {
    t.assert(0);
});

test('passing async test', async t => {
    const r = await server.add(1, 2);
    t.is(r, 3);
});

test('failing async test', async t => {
    const r = await server.subtract(1, 2);
    t.is(r, 42);
});