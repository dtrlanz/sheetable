import { test } from "./test";

test('my test', t => {
    t.is(4, 4);
    t.assert(true);
    t.is(5, 5);
});