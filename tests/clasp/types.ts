import { test } from "./app/test";
import { SF } from "./app/server-fns";
import { server as _server, TypedServer } from "./app/server-proxy";

const server = _server as TypedServer<SF>;

test('write different types to sheet', async t => {
    const values = await server.testWritingTypes();

    t.deepEqual(values, [
        // original values were:
        // true, null, undefined, 53, 9007199254740991n,  'abc', Symbol(my symbol), {}
        [  true, '',   '',        53, "9007199254740991", 'abc', '',                '{}']
    ]);
});
