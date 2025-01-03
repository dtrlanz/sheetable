import test from 'ava';
import { index } from "../src/index.js";
import { SheetClient } from "../src/client.js";
import { sheet } from "./util/sheet-navigation.js";
import { Table } from '../src/table.js';
import { Orientation } from '../src/sheet-navigation.js';
import { SpreadsheetServer } from '../src/server.js';

const client = SheetClient.fromSheet(sheet`
    a  |    | b  | c  |     |     |     | d  | e   | f  |
    a1 | a2 |    | c1 | c2  |     |     |    | e1  |    |
       |    |    |    | c21 | c22 | c23 |    | e11 |    |
     0 |  1 |  2 |  3 |   4 |   5 |   6 |  7 |   8 |  9 |
    10 | 11 | 12 | 13 |  14 |  15 |  16 | 17 |  18 | 19 |
    20 | 21 | 22 | 23 |  24 |  25 |  26 | 27 |  28 | 29 |
    30 | 31 | 32 | 33 |  34 |  35 |  36 | 37 |  38 | 39 |
    40 | 41 | 42 | 43 |  44 |  45 |  46 | 47 |  48 | 49 |
    50 | 51 | 52 | 53 |  54 |  55 |  56 | 57 |  58 | 59 |
    60 | 61 | 62 | 63 |  64 |  65 |  66 | 67 |  68 | 69 |
`);

class Test {
    @index
    a = { a1: 0, a2: 0 };
    @index
    b = 0;
    c = { c1: 0, c2: { c21: 0, c22: 0, c23: 0 } };
    d = 0;
    e = { e1: { e11: 0 } };
    f = 0;
}

function toObj(a1: number, a2?: number, b?: number, c1?: number, c21?: number, c22?: number, c23?: number, d?: number, e11?: number, f?: number) {
    a2 ??= a1 + 1;
    b ??= a1 + 2;
    c1 ??= a1 + 3;
    c21 ??= a1 + 4;
    c22 ??= a1 + 5;
    c23 ??= a1 + 6;
    d ??= a1 + 7;
    e11 ??= a1 + 8;
    f ??= a1 + 9;
    const obj = new Test();
    obj.a = { a1, a2 };
    obj.b = b;
    obj.c = { c1, c2: { c21, c22, c23 } };
    obj.d = d;
    obj.e = { e1: { e11 } };
    obj.f = f;
    return obj;
}

test('open table', async t => {
    const table = await Table.open(Test, { client });
    // retrieve nth item
    for (let i = 0; i < 7; i++) {
        t.deepEqual(await table.at(i), toObj(i * 10));
    }
    t.is(await table.at(7), undefined);
    // retrieve nth-last item
    for (let i = -1; i >= -7; i--) {
        t.deepEqual(await table.at(i), toObj((7 + i) * 10));
    }
    t.is(await table.at(-8), undefined);
    // retrieve item by indexed properties
    for (let i = 0; i < 70; i += 10) {
        t.deepEqual(await table.get({ a1: i, a2: i + 1}, i + 2), toObj(i));
    }
    t.is(await table.get({ a1: 0, a2: 0}, 0), undefined);
});

test('create table', async t => {
    const data = [0, 1, 2, 3, 4, 5, 6].map(i => toObj(i * 10));
    const table = Table.create(data, { client: SheetClient.fromSheet(sheet``) });
    // retrieve nth item
    for (let i = 0; i < 7; i++) {
        t.deepEqual(await table.at(i), toObj(i * 10));
    }
    t.is(await table.at(7), undefined);
    // retrieve nth-last item
    for (let i = -1; i >= -7; i--) {
        t.deepEqual(await table.at(i), toObj((7 + i) * 10));
    }
    t.is(await table.at(-8), undefined);
    // retrieve item by indexed properties
    for (let i = 0; i < 70; i += 10) {
        t.deepEqual(await table.get({ a1: i, a2: i + 1}, i + 2), toObj(i));
    }
    t.is(await table.get({ a1: 0, a2: 0}, 0), undefined);
});

test('set', async t => {
    class A {
        @index
        name: string;
        age: number;
        constructor(name: string, age: number) {
            this.name = name;
            this.age = age;
        }
    }
    const data = [
        new A('Amy', 24),
        new A('Bob', 98),
    ];
    const table = Table.create(data, { client: SheetClient.fromSheet(sheet``) });
    function getCache() {
        return table['slots'].map(s => s.cached);
    }

    t.deepEqual(getCache(), [
        new A('Amy', 24),
        new A('Bob', 98),
    ], 'records from table creation should be present');

    table.set(new A('Carly', 45));
    table.set(new A('Dan', 62));

    t.deepEqual(getCache(), [
        new A('Amy', 24),
        new A('Bob', 98),
        new A('Carly', 45),
        new A('Dan', 62),
    ], 'new records should be added to the end');

    table.set(new A('Amy', 25));
    table.set(new A('Carly', 46));

    t.deepEqual(getCache(), [
        new A('Amy', 25),
        new A('Bob', 98),
        new A('Carly', 46),
        new A('Dan', 62),
    ], 'updated records should keep their positions');
});

test('save', async t => {
    class A {
        @index
        name: string;
        age: number;
        constructor(name: string, age: number) {
            this.name = name;
            this.age = age;
        }
    }
    const testSheet = sheet``;
    const client = SheetClient.fromSheet(testSheet);
    const data = [
        new A('Amy', 24),
        new A('Bob', 98),
    ];
    const table = Table.create(data, { client });
    function getSavedValues() {
        return testSheet
            .getRange(1, 1, testSheet.getLastRow(), testSheet.getLastColumn())
            .getValues();
    }

    await table.save();

    t.deepEqual(getSavedValues(), [
        ['name', 'age'],
        ['Amy',  24],
        ['Bob',  98],
    ], 'records from table creation should be present');

    table.set(new A('Carly', 45));
    table.set(new A('Dan', 62));
    await table.save();

    t.deepEqual(getSavedValues(), [
        ['name', 'age'],
        ['Amy',  24],
        ['Bob',  98],
        ['Carly', 45],
        ['Dan', 62],
    ], 'new records should be added to the end');

    table.set(new A('Amy', 25));
    table.set(new A('Carly', 46));
    await table.save();

    t.deepEqual(getSavedValues(), [
        ['name', 'age'],
        ['Amy',  25],
        ['Bob',  98],
        ['Carly', 46],
        ['Dan', 62],
    ], 'updated records should keep their positions');
});

test('save complex header', async t => {
    async function runTest(orientation: Orientation, expected: any[][]) {
        const testSheet = sheet``;
        const data = [0, 1, 2].map(i => toObj(i * 10));
        const table = Table.create(data, { 
            client: SheetClient.fromSheet(testSheet, undefined, orientation)
        });
        await table.save();
        let numRows = 3, numCols = 10;
        if (orientation === 'transposed') [numRows, numCols] = [numCols, numRows];
        t.deepEqual(testSheet.getRange(1, 1, numRows, numCols).getValues(), expected,
            `unexpected result in ${orientation} orientation`);
    }

    await runTest('normal', [
        [ 'a',  '',   'b', 'c',  '',    '',    '',    'd', 'e',   'f'],
        [ 'a1', 'a2', '',  'c1', 'c2',  '',    '',    '',  'e1',  ''],
        [ '',   '',   '',  '',   'c21', 'c22', 'c23', '',  'e11', ''],
    ]);

    await runTest('transposed', [
        ['a', 'a1', ''],
        ['',  'a2', ''],
        ['b', '',   ''],
        ['c', 'c1', ''],
        ['',  'c2', 'c21'],
        ['',  '',   'c22'],
        ['',  '',   'c23'],
        ['d', '',   ''],
        ['e', 'e1', 'e11'],
        ['f', '',   ''],
    ]);
});

test('save timeout', async t => {
    const testSheet = sheet``;
    const server = new SpreadsheetServer(testSheet);
    // simulate 100ms delayed response
    const client = new SheetClient(request => new Promise(resolve => {
        setTimeout(() => resolve(server.processRequest(request)), 100);
    }));

    const data = [0, 1, 2].map(i => toObj(i * 10));
    const table = Table.create(data, { client });

    table.set(toObj(30));
    await t.throwsAsync(() => table.save({ timeout: 10 }), undefined,
        'timeout too small: request should fail');

    table.set(toObj(40));
    await t.notThrowsAsync(() => table.save({ timeout: 400 }), 
        'timeout big enoug: request should succeed');
});

test('save retry', async t => {
    const testSheet = sheet``;
    const server = new SpreadsheetServer(testSheet);
    // simulate failure of server request
    let deny = 0;
    const client = new SheetClient(request => new Promise((resolve, reject) => {
        if (deny > 0) {
            reject(new Error(`request will be denied ${deny--} time(s)`));
        }
        resolve(server.processRequest(request));
    }));

    const data = [0, 1, 2].map(i => toObj(i * 10));
    const table = Table.create(data, { client });
    await table.save();

    table.set(toObj(30));
    deny = 3;
    await t.throwsAsync(() => table.save({ retryLimit: 2 }), undefined,
        'should fail: cannot try more than 3 times');

    table.set(toObj(40));
    deny = 2;
    await t.notThrowsAsync(() => table.save({ timeout: 1000, retryLimit: 2 }),
        'should succeed on 3rd try');
});

test('save changes only', async t => {
    const testSheet = sheet``;
    const server = new SpreadsheetServer(testSheet);
    let writeLength = 0;
    const client = new SheetClient(request => new Promise(resolve => {
        writeLength = request.writeData?.rows.length ?? 0;
        resolve(server.processRequest(request));
    }));

    const data = [0, 1, 2].map(i => toObj(i * 10));
    const table = Table.create(data, { client });

    await table.save();
    t.is(writeLength, 3, 'should write all 3 initial records');

    table.set(toObj(30));
    await table.save({ changesOnly: true });
    t.is(writeLength, 1, 'should write only 1 (new) record');

    await table.save({ changesOnly: false });
    t.is(writeLength, 4, 'should write all 4 records');

    writeLength = 0;
    await table.save({ changesOnly: true });
    t.is(writeLength, 0, 'should not write any records as none were changed');
});

test('get raw', async t => {
    const table = await Table.open(Test, { client });
    // retrieve nth item
    for (let i = 0; i < 7; i++) {
        t.deepEqual(await table.getRaw(i), { ...toObj(i * 10) });
    }
    t.is(await table.getRaw(7), undefined);
});

test('set raw', async t => {
    const client = SheetClient.fromSheet(sheet`
        a  |    | b  | c  |     |     |     | d  | e   | f  |
        a1 | a2 |    | c1 | c2  |     |     |    | e1  |    |
           |    |    |    | c21 | c22 | c23 |    | e11 |    |
         0 |  1 |  2 |  3 |   4 |   5 |   6 |  7 |   8 |  9 |
        10 | 11 | 12 | 13 |  14 |  15 |  16 | 17 |  18 | 19 |
        20 | 21 | 22 | 23 |  24 |  25 |  26 | 27 |  28 | 29 |
        30 | 31 | 32 | 33 |  34 |  35 |  36 | 37 |  38 | 39 |
        40 | 41 | 42 | 43 |  44 |  45 |  46 | 47 |  48 | 49 |
        50 | 51 | 52 | 53 |  54 |  55 |  56 | 57 |  58 | 59 |
        60 | 61 | 62 | 63 |  64 |  65 |  66 | 67 |  68 | 69 |
    `);
    const table = await Table.open(Test, { client });
    await table.setRaw(0, toObj(30));
    t.deepEqual(await table.at(0), await table.at(3));
});

test('front matter', async t => {
    // Open table with front matter
    const table0 = await Table.open(Test, { 
        client, 
        frontMatterRowCount: 2      // treat first 2 rows as front matter (i.e., ignore them)
    });
    // retrieve nth item
    for (let i = 0; i < 5; i++) {
        t.deepEqual(await table0.at(i), toObj((i + 2) * 10));
    }
    // end of table
    t.is(await table0.at(5), undefined);

    // Create table with front matter
    const data = [0, 1, 2, 3, 4, 5, 6].map(i => toObj(i * 10));
    const table1 = Table.create(data, { 
        client: SheetClient.fromSheet(sheet``),
        frontMatterRowCount: 1,     // treat first row as front matter (i.e., ignore it)
    });
    // retrieve nth item
    for (let i = 0; i < 7; i++) {
        t.deepEqual(await table1.at(i), toObj(i * 10));
    }
    t.is(await table1.at(7), undefined);
    // // get front matter
    // t.deepEqual(await table1.getRaw(0), {
    //     a: {
    //         a1: undefined,
    //         a2: undefined,
    //     },
    //     b: undefined,
    //     c: {
    //         c1: undefined,
    //         c2: {
    //             c21: undefined,
    //             c22: undefined,
    //             c23: undefined,
    //         },
    //     },
    //     d: undefined,
    //     e: { e1: { e11: undefined }},
    //     f: undefined,
    // });
});