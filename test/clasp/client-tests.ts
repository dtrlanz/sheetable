import { test } from "./test";
export { display } from "./test";
import { SF } from "./server-fns";

test('my test', t => {
    t.is(4, 4);
    t.assert(true);
    t.is(5, 5);
});

test<SF>('add', async (t, server) => {
    const r = await server.add(1, 2);
    t.is(r, 3);
});

test<SF>('subtract', async (t, server) => {
    const r = await server.subtract(1, 2);
    t.is(r, -1);
});

