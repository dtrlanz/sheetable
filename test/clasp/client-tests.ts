import { test } from "./test";
import { SF } from "./server-fns";
import { server as _server, TypedServer } from "./server-proxy";

const server = _server as TypedServer<SF>;

test('deep equal pass', t => {
    const a = { foo: 25, bar: ['x', 'y', 'z'], baz: { q: true, r: false } };
    const b = { ...a, bar: ['x', 'y', 'z'] };
    t.deepEqual(a, b);
});

test('deep equal fail', t => {
    const a = { foo: 25, bar: ['x', 'y', 'z'], baz: { q: true, r: false } };
    const b = { ...a, bar: ['x', 'y', 'c'] };
    t.deepEqual(a, b);
});