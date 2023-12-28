import { test } from "./test";
import { SF } from "./server-fns";
import { server as _server, TypedServer } from "./server-proxy";

const server = _server as TypedServer<SF>;

test('write different types to sheet', async t => {
    const values = await server.testWritingTypes();

    t.deepEqual(values, [
        // original values were:
        // true, null, undefined, 53, 9007199254740991n,  'abc', Symbol(my symbol), {}
        [  true, '',   '',        53, "9007199254740991", 'abc', '',                '{}']
    ]);
});
