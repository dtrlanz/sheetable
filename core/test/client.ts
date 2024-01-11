import test from 'ava';
import { sheet } from "./util/sheet-navigation.js";
import { Branch } from '../lib/headers.js';
import { SheetClient, SheetEventParams } from '../lib/client.js';
import { SheetLike } from '../lib/sheet-navigation.js';

function getSampleSheet() {
    return sheet`
        A  |    | B  | C  |     |     |     | D  | E   | F  |
        A1 | A2 |    | C1 | C2  |     |     |    | E1  |    |
           |    |    |    | C21 | C22 | C23 |    | E11 |    |
         0 |  1 |  2 |  3 |   4 |   5 |   6 |  7 |   8 |  9 |
        10 | 11 | 12 | 13 |  14 |  15 |  16 | 17 |  18 | 19 |
        20 | 21 | 22 | 23 |  24 |  25 |  26 | 27 |  28 | 29 |
        30 | 31 | 32 | 33 |  34 |  35 |  36 | 37 |  38 | 39 |
        40 | 41 | 42 | 43 |  44 |  45 |  46 | 47 |  48 | 49 |
        50 | 51 | 52 | 53 |  54 |  55 |  56 | 57 |  58 | 59 |
        60 | 61 | 62 | 63 |  64 |  65 |  66 | 67 |  68 | 69 |
    `;    
}

const sample = getSampleSheet();

const expectedHeaders = [
    br('A', 1, 1, 3,
        br('A1', 2, 1, 2),
        br('A2', 2, 2, 3)),
    br('B', 1, 3, 4),
    br('C', 1, 4, 8,
        br('C1', 2, 4, 5),
        br('C2', 2, 5, 8,
            br('C21', 3, 5, 6),
            br('C22', 3, 6, 7),
            br('C23', 3, 7, 8))),
    br('D', 1, 8, 9),
    br('E', 1, 9, 10,
        br('E1', 2, 9, 10,
        br('E11', 3, 9, 10))),
    br('F', 1, 10, 11)
];

function br(label: string, row: number, start: number, stop: number, ...children: Branch[]) {
    return { label, row, start, stop, children };
}

test('client get', async t => {
    const client = SheetClient.fromSheet(sample);
    const { headers: headers0, data: data0 } = await client.readTable('none');
    t.deepEqual(headers0, expectedHeaders);
    t.is(data0, undefined);

    const { headers: headers1, data: data1 } = await client.readTable('all');
    t.deepEqual(headers1, expectedHeaders);
    t.is(data1?.rowOffset, 4);
    t.deepEqual(data1?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data1?.rows, sample.getRange(4, 1, 7, 10).getValues());
    
    const { headers: headers2, data: data2 } = await client.readTable(['A', 'B', 'C', 'D', 'E', 'F']);
    t.deepEqual(headers2, expectedHeaders);
    t.deepEqual(data2?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data2?.rows, sample.getRange(4, 1, 7, 10).getValues());

    const { headers: headers3, data: data3 } = await client.readTable(['A', 'C']);
    t.deepEqual(headers3, expectedHeaders);
    t.deepEqual(data3?.colNumbers, [1, 2, 4, 5, 6, 7]);
    t.deepEqual(data3?.rows, sample.getRange(4, 1, 7, 11).getValues()
        .map(row => [1, 2, 4, 5, 6, 7].map(n => row[n - 1])));
});

test('client read rows', async t => {
    const client = SheetClient.fromSheet(sample);
    const data0 = await client.readRows();
    t.deepEqual(data0, sample.getRange(1, 1, 10, 10).getValues());
    
    const data1 = await client.readRows(4, 11);
    t.deepEqual(data1, sample.getRange(4, 1, 7, 10).getValues());

    const data = await client.readRows(7, 9);
    t.deepEqual(data, sample.getRange(7, 1, 2, 10).getValues());
});

test('client write row data', async t => {
    const testSheet = getSampleSheet();
    const client = SheetClient.fromSheet(testSheet);

    await client.writeRows(5, [
        [-10, -11, -12, -13, -14, -15, -16, -17, -18, -19],
    ]);
    await client.writeRows(7, [
        [-30, -31, -32, -33, -34, -35, -36, -37, -38, -39],
        [-40, -41, -42, -43, -44, -45, -46, -47, -48, -49],
    ]);

    t.deepEqual(testSheet.getRange(4, 1, 6, 10).getValues(), [
        [  0,   1,   2,   3,   4,   5,  6,    7,   8,   9],
        [-10, -11, -12, -13, -14, -15, -16, -17, -18, -19],
        [ 20,  21,  22,  23,  24,  25,  26,  27,  28,  29],
        [-30, -31, -32, -33, -34, -35, -36, -37, -38, -39],
        [-40, -41, -42, -43, -44, -45, -46, -47, -48, -49],
        [ 50,  51,  52,  53,  54,  55,  56,  57,  58,  59],
    ]);
});

test('insert rows', async t => {
    const testSheet = getSampleSheet();
    const client = SheetClient.fromSheet(testSheet);

    function testValues() {
        return testSheet.getRange(1, 1, testSheet.getLastRow(), testSheet.getLastColumn()).getValues();
    }

    const expected = sample.getRange(1, 1, sample.getLastRow(), sample.getLastColumn()).getValues();

    function insert(position: number, count: number = 1) {
        const newRows = [];
        for (let i = 0; i < count; i++) {
            newRows.push(repeat('', 10));
        }
        expected.splice(position - 1, 0, ...newRows);
    }

    t.deepEqual(testValues(), expected);

    await client.insertRows(4);
    insert(4);
    t.deepEqual(testValues(), expected);

    await client.insertRows(1, 3);
    insert(1, 3);
    t.deepEqual(testValues(), expected);

    await client.insertRows(10, 0);
    t.deepEqual(testValues(), expected);

    await client.insertRows(10, 10);
    insert(10, 10);
    t.deepEqual(testValues(), expected);
});

test('insert columns', async t => {
    const testSheet = getSampleSheet();
    const client = SheetClient.fromSheet(testSheet);

    function testValues() {
        return testSheet.getRange(1, 1, testSheet.getLastRow(), testSheet.getLastColumn()).getValues();
    }

    const expected = sample.getRange(1, 1, sample.getLastRow(), sample.getLastColumn()).getValues();

    function insert(position: number, count: number = 1) {
        for (const row of expected) {
            row.splice(position - 1, 0, ...repeat('', count));
        }
    }

    t.deepEqual(testValues(), expected);

    await client.insertColumns(4);
    insert(4);
    t.deepEqual(testValues(), expected);

    await client.insertColumns(1, 3);
    insert(1, 3);
    t.deepEqual(testValues(), expected);

    await client.insertColumns(10, 0);
    t.deepEqual(testValues(), expected);

    await client.insertColumns(10, 10);
    insert(10, 10);
    t.deepEqual(testValues(), expected);
});

test('delete rows', async t => {
    const testSheet = getSampleSheet();
    const client = SheetClient.fromSheet(testSheet);

    function testValues() {
        return testSheet.getRange(1, 1, testSheet.getLastRow(), testSheet.getLastColumn()).getValues();
    }

    const expected = sample.getRange(1, 1, sample.getLastRow(), sample.getLastColumn()).getValues();

    function del(position: number, count: number = 1) {
        expected.splice(position - 1, count);
    }

    t.deepEqual(testValues(), expected);

    await client.deleteRows(8);
    del(8);
    t.deepEqual(testValues(), expected);

    await client.deleteRows(1, 3);
    del(1, 3);
    t.deepEqual(testValues(), expected);

    await client.deleteRows(5, 0);
    t.deepEqual(testValues(), expected);

    await client.deleteRows(5, 10);
    del(5, 10);
    t.deepEqual(testValues(), expected);
});

test('delete columns', async t => {
    const testSheet = getSampleSheet();
    const client = SheetClient.fromSheet(testSheet);

    function testValues() {
        return testSheet.getRange(1, 1, testSheet.getLastRow(), testSheet.getLastColumn()).getValues();
    }

    const expected = sample.getRange(1, 1, sample.getLastRow(), sample.getLastColumn()).getValues();

    function del(position: number, count: number = 1) {
        for (const row of expected) {
            row.splice(position - 1, count);
        }
    }

    t.deepEqual(testValues(), expected);

    await client.deleteColumns(8);
    del(8);
    t.deepEqual(testValues(), expected);

    await client.deleteColumns(1, 3);
    del(1, 3);
    t.deepEqual(testValues(), expected);

    await client.deleteColumns(5, 0);
    t.deepEqual(testValues(), expected);

    await client.deleteColumns(5, 10);
    del(5, 10);
    t.deepEqual(testValues(), expected);
});

test('insert & delete with transposed orientation', async t => {
    const testSheet = getSampleSheet();
    const client = SheetClient.fromSheet(testSheet, undefined, 'transposed');

    function testValues() {
        return testSheet.getRange(1, 1, testSheet.getLastRow(), testSheet.getLastColumn()).getValues();
    }

    // transpose sample range
    const expected = sample.getRange(1, 1, sample.getLastRow(), sample.getLastColumn()).getValues();

    function insertRows(position: number, count: number = 1) {
        for (const col of expected) {
            col.splice(position - 1, 0, ...repeat('', count));
        }
    }

    function insertColumns(position: number, count: number = 1) {
        const numRows = expected[0].length;
        const newCols = [];
        for (let i = 0; i < count; i++) {
            newCols.push(repeat('', numRows));
        }
        expected.splice(position - 1, 0, ...newCols);
    }

    function deleteRows(position: number, count: number = 1) {
        for (const row of expected) {
            row.splice(position - 1, count);
        }
    }

    function deleteColumns(position: number, count: number = 1) {
        expected.splice(position - 1, count);
    }

    await client.insertRows(4);
    insertRows(4);
    t.deepEqual(testValues(), expected);

    await client.insertColumns(5);
    insertColumns(5);
    t.deepEqual(testValues(), expected);

    await client.deleteRows(4);
    deleteRows(4);
    t.deepEqual(testValues(), expected);

    await client.deleteColumns(5);
    deleteColumns(5);
    t.deepEqual(testValues(), expected);
});

function repeat<T>(value: T, count: number): T[] {
    const arr = [];
    for (let i = 0; i < count; i++) {
        arr.push(value);
    }
    return arr;
}

test('update queued requests on row/column insertion/deletion (general)', async t => {
    const testSheet = getSampleSheet();
    const client = SheetClient.fromSheet(testSheet, undefined);

    // track events for debugging
    const eventArgs: [...args: SheetEventParams<'structuralChange'>][] = [];
    client.addEventListener('structuralChange', (...args) => eventArgs.push(args));

    // Insert rows
    const beforeInsertingRows = client.readRows(6, 7);
    const insertRows = client.insertRows(5, 2);
    const afterInsertingRows = client.readRows(6, 7);
    t.deepEqual(await beforeInsertingRows, [
        [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
    ]);
    await insertRows;
    // confirm that event fired
    t.deepEqual(eventArgs.at(-1), ['inserted', 'rows', 5, 2]);
    // confirm that request was updated
    t.deepEqual(client['requestsSent'][0].request.readData, {
        rowStart: 8,    // originally 6
        rowStop: 9,     // originally 7
    });
    // confirm that the data retrieved is what was originally in row 6 (now row 8)
    t.deepEqual(await afterInsertingRows, [
        [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
    ]);

    // Delete rows
    const beforeDeletingRows = client.readRows(7, 8);
    const deleteRows = client.deleteRows(5, 2);
    const afterDeletingRows = client.readRows(7, 8);
    t.deepEqual(await beforeDeletingRows, [
        [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    ]);
    await deleteRows;
    // confirm that event fired
    t.deepEqual(eventArgs.at(-1), ['deleted', 'rows', 5, 2]);
    // confirm that request was updated
    t.deepEqual(client['requestsSent'][0].request.readData, {
        rowStart: 5,    // originally 7
        rowStop: 6,     // originally 8
    });
    // confirm that the data retrieved is what was originally in row 7 (now row 5)
    t.deepEqual(await afterDeletingRows, [
        [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    ]);

    // Insert columns
    const beforeInsertingColumns = client.readRows(6, 7);
    const insertColumns = client.insertColumns(5, 2);
    const afterInsertingColumns = client.readRows(6, 7);
    t.deepEqual(await beforeInsertingColumns, [
        [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
    ]);
    await insertColumns;
    // confirm that event fired
    t.deepEqual(eventArgs.at(-1), ['inserted', 'columns', 5, 2]);
    // confirm that request was updated
    t.deepEqual(client['requestsSent'][0].request.limit, {
        rowStart: 1,
        rowStop: 11,
        colStart: 1,
        colStop: 13,    // originally 11
    });
    // confirm that the data retrieved reflects the column insertion
    t.deepEqual(await afterInsertingColumns, [
        [20, 21, 22, 23, '', '', 24, 25, 26, 27, 28, 29]
    ]);

    // Delete columns
    const beforeDeletingColumns = client.readRows(6, 7);
    const deleteColumns = client.deleteColumns(5, 2);
    const afterDeletingColumns = client.readRows(6, 7);
    t.deepEqual(await beforeDeletingColumns, [
        [20, 21, 22, 23, '', '', 24, 25, 26, 27, 28, 29]
    ]);
    await deleteColumns;
    // confirm that event fired
    t.deepEqual(eventArgs.at(-1), ['deleted', 'columns', 5, 2]);
    // confirm that request was updated
    t.deepEqual(client['requestsSent'][0].request.limit, {
        rowStart: 1,
        rowStop: 11,
        colStart: 1,
        colStop: 11,    // originally 13
    });
    // confirm that the data retrieved reflects the column deletion
    t.deepEqual(await afterDeletingColumns, [
        [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
    ]);
});

test('update queued requests on row deletion (specific cases)', async t => {
    async function testCase<T>(
        cmd: (c: SheetClient) => Promise<T>, 
        test: (o: { sheet: SheetLike, result: T }) => void,
    ) {
        const sheet = getSampleSheet();
        const client = SheetClient.fromSheet(sheet, undefined);
        // queue row deletion (delete rows 6, 7, 8)
        const deleteRows = client.deleteRows(6, 3);
        // queue other request
        const otherRequest = cmd(client);
        // await row deletion, which may affect other request
        await deleteRows;
        // run assertions
        const result = await otherRequest;
        test({ sheet, result });
    }

    await testCase(
        () => Promise.resolve(),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 4, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row 5
            [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],   // row 6 (old 9)
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 7 (old 10)
        ], 'reference case'),
    );

    await testCase(
        client => client.readRows(5, 10),
        ({ result }) => t.deepEqual(result, [
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row 5
            [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],   // row 6 (old 9)
        ], 'read should return remaining rows'),
    );

    await testCase(
        client => client.writeRows(5, [
            [-10, -11, -12, -13, -14, -15, -16, -17, -18, -19],   // row 5
            [-20, -21, -22, -23, -24, -25, -26, -27, -28, -29],   // row 6
            [-30, -31, -32, -33, -34, -35, -36, -37, -38, -39],   // row 7
            [-40, -41, -42, -43, -44, -45, -46, -47, -48, -49],   // row 8
            [-50, -51, -52, -53, -54, -55, -56, -57, -58, -59],   // row 9
        ]),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 4, 10).getValues(), [
            [  0,   1,   2,   3,   4,   5,   6,   7,   8,   9],   // row 4
            [-10, -11, -12, -13, -14, -15, -16, -17, -18, -19],   // row 5
            [-50, -51, -52, -53, -54, -55, -56, -57, -58, -59],   // row 6 (old 9)
            [ 60,  61,  62,  63,  64,  65,  66,  67,  68,  69],   // row 7 (old 10)
        ], 'write should affect remaining rows (only)'),
    );

    await testCase(
        client => client.insertRows(5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 5, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            ['', '', '', '', '', '', '', '', '', ''],   // row 5 (new)
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row 6 (old 5)
            [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],   // row 7 (old 9)
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 9 (old 10)
        ], 'row insertion before should proceed unaffected'),
    );

    await testCase(
        client => client.insertRows(10),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 5, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row 5
            [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],   // row 6 (old 9)
            ['', '', '', '', '', '', '', '', '', ''],   // row 7 (new)
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 8 (old 10)
        ], 'row insertion after should shift up'),
    );

    await testCase(
        client => client.deleteRows(5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 3, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],   // row 5 (old 9)
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 6 (old 10)
        ], 'row deletion before should proceed unaffected'),
    );

    await testCase(
        client => client.deleteRows(9),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 3, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row 5
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 6 (old 10)
        ], 'row deletion after should shift up'),
    );

    await testCase(
        // rows deleted by both requests: 6, 7, 8, 9
        client => client.deleteRows(7, 3),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 3, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row 5
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 6 (old 10)
        ], 'overlapping row deletion should not affect more rows than intended (a)'),
    );

    await testCase(
        // rows deleted by both requests: 6, 7, 8, 9
        client => client.deleteRows(5, 3),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 3, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],   // row 5 (old 9)
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 6 (old 10)
        ], 'overlapping row deletion should not affect more rows than intended (b)'),
    );

    await testCase(
        // rows deleted by both requests: 5, 6, 7, 8, 9
        client => client.deleteRows(5, 5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 5 (old 10)
        ], 'overlapping row deletion should not affect more rows than intended (c)'),
    );

    await testCase(
        client => client.deleteColumns(4, 2),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 4, 8).getValues(), [
            [ 0,  1,  2,  5,  6,  7,  8,  9],
            [10, 11, 12, 15, 16, 17, 18, 19],
            [50, 51, 52, 55, 56, 57, 58, 59],
            [60, 61, 62, 65, 66, 67, 68, 69],
        ], 'column deletion should proceed unaffected'),
    );
    
    await testCase(
        client => client.insertColumns(4, 2),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 4, 12).getValues(), [
            [ 0,  1,  2, '', '',  3,  4,  5,  6,  7,  8,  9],
            [10, 11, 12, '', '', 13, 14, 15, 16, 17, 18, 19],
            [50, 51, 52, '', '', 53, 54, 55, 56, 57, 58, 59],
            [60, 61, 62, '', '', 63, 64, 65, 66, 67, 68, 69],
        ], 'column insertion should proceed unaffected'),
    );
});

test('update queued requests on row insertion (specific cases)', async t => {
    async function testCase<T>(
        cmd: (c: SheetClient) => Promise<T>, 
        test: (o: { sheet: SheetLike, result: T }) => void,
    ) {
        const sheet = getSampleSheet();
        const client = SheetClient.fromSheet(sheet, undefined);
        // queue row insertion (2 new rows before row 6)
        const insertRows = client.insertRows(6, 2);
        // queue other request
        const otherRequest = cmd(client);
        // row insertion may affect other request
        await insertRows;
        // run assertions
        const result = await otherRequest;
        test({ sheet, result });
    }

    await testCase(
        () => Promise.resolve(),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 9, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row  4
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row  5
            ['', '', '', '', '', '', '', '', '', ''],   // row  6 (new)
            ['', '', '', '', '', '', '', '', '', ''],   // row  7 (new)
            [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],   // row  8 (old  6)
            [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],   // row  9 (old  7)
            [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],   // row 10 (old  8)
            [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],   // row 11 (old  9)
            [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],   // row 12 (old 10)
        ], 'reference case'),
    );

    await testCase(
        client => client.readRows(5, 8),
        ({ result }) => t.deepEqual(result, [
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row  5
            ['', '', '', '', '', '', '', '', '', ''],   // row  6 (new)
            ['', '', '', '', '', '', '', '', '', ''],   // row  7 (new)
            [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],   // row  8 (old  6)
            [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],   // row  9 (old  7)
        ], 'read should cover requested range but include inserted rows'),
    );

    await testCase(
        client => client.writeRows(5, [
            [-10, -11, -12, -13, -14, -15, -16, -17, -18, -19],   // row 5
            [-20, -21, -22, -23, -24, -25, -26, -27, -28, -29],   // row 6
            [-30, -31, -32, -33, -34, -35, -36, -37, -38, -39],   // row 7
        ]),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 7, 10).getValues(), [
            [  0,   1,   2,   3,   4,   5,   6,   7,   8,   9],   // row  4
            [-10, -11, -12, -13, -14, -15, -16, -17, -18, -19],   // row  5
            [ '',  '',  '',  '',  '',  '',  '',  '',  '',  ''],   // row  6 (new)
            [ '',  '',  '',  '',  '',  '',  '',  '',  '',  ''],   // row  7 (new)
            [-20, -21, -22, -23, -24, -25, -26, -27, -28, -29],   // row  8 (old 6)
            [-30, -31, -32, -33, -34, -35, -36, -37, -38, -39],   // row  9 (old 7)
            [ 40,  41,  42,  43,  44,  45,  46,  47,  48,  49],   // row 10 (old 8)
        ], 'write should affect requested rows (only)'),
    );

    await testCase(
        client => client.insertRows(5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 6, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row  4
            ['', '', '', '', '', '', '', '', '', ''],   // row  5 (new)
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row  6 (old 5)
            ['', '', '', '', '', '', '', '', '', ''],   // row  7 (new)
            ['', '', '', '', '', '', '', '', '', ''],   // row  8 (new)
            [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],   // row  9 (old  6)
        ], 'row insertion before should proceed unaffected'),
    );

    await testCase(
        client => client.insertRows(7),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 7, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row  4
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row  5
            ['', '', '', '', '', '', '', '', '', ''],   // row  6 (new)
            ['', '', '', '', '', '', '', '', '', ''],   // row  7 (new)
            [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],   // row  8 (old  6)
            ['', '', '', '', '', '', '', '', '', ''],   // row  9 (new)
            [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],   // row 10 (old  7)
        ], 'row insertion after should shift down'),
    );

    await testCase(
        client => client.deleteRows(5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 4, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row 4
            ['', '', '', '', '', '', '', '', '', ''],   // row 5 (new)
            ['', '', '', '', '', '', '', '', '', ''],   // row 6 (new)
            [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],   // row 7 (old 6)
        ], 'row deletion before should proceed unaffected'),
    );

    await testCase(
        client => client.deleteRows(7),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 6, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row  4
            [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],   // row  5
            ['', '', '', '', '', '', '', '', '', ''],   // row  6 (new)
            ['', '', '', '', '', '', '', '', '', ''],   // row  7 (new)
            [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],   // row  8 (old  6)
            [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],   // row  9 (old  8)
        ], 'row deletion after should shift down'),
    );

    await testCase(
        //delete rows 5, 6, 7
        client => client.deleteRows(5, 3),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 5, 10).getValues(), [
            [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9],   // row  4
            ['', '', '', '', '', '', '', '', '', ''],   // row  5 (new)
            ['', '', '', '', '', '', '', '', '', ''],   // row  6 (new)
            [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],   // row  7 (old 8)
            [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],   // row  8 (old 9)
        ], 'overlapping row deletion should not affect newly inserted rows'),
    );

    await testCase(
        client => client.deleteColumns(4, 2),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 5, 8).getValues(), [
            [ 0,  1,  2,  5,  6,  7,  8,  9],   // row  4
            [10, 11, 12, 15, 16, 17, 18, 19],   // row  5
            ['', '', '', '', '', '', '', ''],   // row  6 (new)
            ['', '', '', '', '', '', '', ''],   // row  7 (new)
            [20, 21, 22, 25, 26, 27, 28, 29],   // row  8 (old  6)
        ], 'column deletion should proceed unaffected'),
    );
    
    await testCase(
        client => client.insertColumns(4, 2),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 5, 12).getValues(), [
            [ 0,  1,  2, '', '',  3,  4,  5,  6,  7,  8,  9],   // row  4
            [10, 11, 12, '', '', 13, 14, 15, 16, 17, 18, 19],   // row  5
            ['', '', '', '', '', '', '', '', '', '', '', ''],   // row  6 (new)
            ['', '', '', '', '', '', '', '', '', '', '', ''],   // row  7 (new)
            [20, 21, 22, '', '', 23, 24, 25, 26, 27, 28, 29],   // row  8 (old  6)
        ], 'column insertion should proceed unaffected'),
    );
});

test('update queued requests on column deletion (specific cases)', async t => {
    async function testCase<T>(
        cmd: (c: SheetClient) => Promise<T>, 
        test: (o: { sheet: SheetLike, result: T }) => void,
    ) {
        const sheet = getSampleSheet();
        const client = SheetClient.fromSheet(sheet, undefined);
        // queue column deletion (delete columns 5, 6, 7)
        const deleteColumns = client.deleteColumns(5, 3);
        // queue other request
        const otherRequest = cmd(client);
        // column deletion may affect other request
        await deleteColumns;
        // run assertions
        const result = await otherRequest;
        test({ sheet, result });
    }

    await testCase(
        () => Promise.resolve(),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 7, 7).getValues(), [
            //1   2   3   4   8   9  10  <-- original column numbers
            [ 0,  1,  2,  3,  7,  8,  9],   // row 4
            [10, 11, 12, 13, 17, 18, 19],   // row 5
            [20, 21, 22, 23, 27, 28, 29],   // row 6
            [30, 31, 32, 33, 37, 38, 39],   // row 7
            [40, 41, 42, 43, 47, 48, 49],   // row 8
            [50, 51, 52, 53, 57, 58, 59],   // row 9
            [60, 61, 62, 63, 67, 68, 69],   // row 10
        ], 'reference case'),
    );

    await testCase(
        client => client.readRows(5, 8),
        ({ result }) => t.deepEqual(result, [
            [10, 11, 12, 13, 17, 18, 19],   // row 5
            [20, 21, 22, 23, 27, 28, 29],   // row 6
            [30, 31, 32, 33, 37, 38, 39],   // row 7
        ], 'read should proceed unaffected'),
    );

    await testCase(
        client => client.writeRows(5, [
            [-10, -11, -12, -13, -14, -15, -16, -17, -18, -19],   // row 5
            [-20, -21, -22, -23, -24, -25, -26, -27, -28, -29],   // row 6
            [-30, -31, -32, -33, -34, -35, -36, -37, -38, -39],   // row 7
        ]),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 5, 7).getValues(), [
            [  0,   1,   2,   3,   7,   8,   9],   // row 4
            [-10, -11, -12, -13, -17, -18, -19],   // row 5
            [-20, -21, -22, -23, -27, -28, -29],   // row 6
            [-30, -31, -32, -33, -37, -38, -39],   // row 7
            [ 40,  41,  42,  43,  47,  48,  49],   // row 8
        ], 'write should affect remaining columns (only)'),
    );

    await testCase(
        client => client.deleteRows(5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 3, 7).getValues(), [
            [ 0,  1,  2,  3,  7,  8,  9],   // row 4
            [20, 21, 22, 23, 27, 28, 29],   // row 5 (old 6)
            [30, 31, 32, 33, 37, 38, 39],   // row 6 (old 7)
        ], 'row deletion should proceed unaffected'),
    );

    await testCase(
        client => client.insertRows(5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 4, 7).getValues(), [
            [ 0,  1,  2,  3,  7,  8,  9],   // row 4
            ['', '', '', '', '', '', ''],   // row 5 (new)
            [10, 11, 12, 13, 17, 18, 19],   // row 6 (old 5)
            [20, 21, 22, 23, 27, 28, 29],   // row 7 (old 6)
        ], 'row insertion should proceed unaffected'),
    );

    await testCase(
        // columns deleted by both requests: 3, 5, 6, 7
        client => client.deleteColumns(3),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 6).getValues(), [
            [ 0,  1,  3,  7,  8,  9],   // row 4
            [10, 11, 13, 17, 18, 19],   // row 5
        ], 'column deletion before should proceed unaffected'),
    );

    await testCase(
        // columns deleted by both requests: 5, 6, 7, 9
        client => client.deleteColumns(9),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 6).getValues(), [
            [ 0,  1,  2,  3,  7,  9],   // row 4
            [10, 11, 12, 13, 17, 19],   // row 5
        ], 'column deletion after should shift left'),
    );

    await testCase(
        // columns deleted by both requests: 4, 5, 6, 7
        client => client.deleteColumns(4, 3),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 6).getValues(), [
            [ 0,  1,  2,  7,  8,  9],   // row 4
            [10, 11, 12, 17, 18, 19],   // row 5
        ], 'overlapping column deletion should not affect more columns than intended (a)'),
    );

    await testCase(
        // columns deleted by both requests: 5, 6, 7, 8
        client => client.deleteColumns(6, 3),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 6).getValues(), [
            [ 0,  1,  2,  3,  8,  9],   // row 4
            [10, 11, 12, 13, 18, 19],   // row 5
        ], 'overlapping column deletion should not affect more columns than intended (b)'),
    );

    await testCase(
        // columns deleted by both requests: 4, 5, 6, 7, 8
        client => client.deleteColumns(4, 5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 5).getValues(), [
            [ 0,  1,  2,  8,  9],   // row 4
            [10, 11, 12, 18, 19],   // row 5
        ], 'overlapping column deletion should not affect more columns than intended (c)'),
    );

    await testCase(
        client => client.insertColumns(4),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 8).getValues(), [
            [ 0,  1,  2, '',  3,  7,  8,  9],   // row 4
            [10, 11, 12, '', 13, 17, 18, 19],   // row 5
        ], 'column insertion before should not proceed unaffected'),
    );

    await testCase(
        client => client.insertColumns(9),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 8).getValues(), [
            [ 0,  1,  2,  3,  7, '',  8,  9],   // row 4
            [10, 11, 12, 13, 17, '', 18, 19],   // row 5
        ], 'column insertion after should shift left'),
    );
});

test('update queued requests on column insertion (specific cases)', async t => {
    async function testCase<T>(
        cmd: (c: SheetClient) => Promise<T>, 
        test: (o: { sheet: SheetLike, result: T }) => void,
    ) {
        const sheet = getSampleSheet();
        const client = SheetClient.fromSheet(sheet, undefined);
        // queue column insertion (2 new rows before row 6)
        const insertColumns = client.insertColumns(6, 2);
        // queue other request
        const otherRequest = cmd(client);
        // column insertion may affect other request
        await insertColumns;
        // run assertions
        const result = await otherRequest;
        test({ sheet, result });
    }

    await testCase(
        () => Promise.resolve(),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 7, 12).getValues(), [
            [ 0,  1,  2,  3,  4, '', '',  5,  6,  7,  8,  9],   // row 4
            [10, 11, 12, 13, 14, '', '', 15, 16, 17, 18, 19],   // row 5
            [20, 21, 22, 23, 24, '', '', 25, 26, 27, 28, 29],   // row 6
            [30, 31, 32, 33, 34, '', '', 35, 36, 37, 38, 39],   // row 7
            [40, 41, 42, 43, 44, '', '', 45, 46, 47, 48, 49],   // row 8
            [50, 51, 52, 53, 54, '', '', 55, 56, 57, 58, 59],   // row 9
            [60, 61, 62, 63, 64, '', '', 65, 66, 67, 68, 69],   // row 10
        ], 'reference case'),
    );

    await testCase(
        client => client.readRows(4, 6),
        ({ result }) => t.deepEqual(result, [
            [ 0,  1,  2,  3,  4, '', '',  5,  6,  7,  8,  9],   // row 4
            [10, 11, 12, 13, 14, '', '', 15, 16, 17, 18, 19],   // row 5
        ], 'read should proceed unaffected'),
    );

    await testCase(
        client => client.writeRows(5, [
            [-10, -11, -12, -13, -14, -15, -16, -17, -18, -19],   // row 5
            [-20, -21, -22, -23, -24, -25, -26, -27, -28, -29],   // row 6
        ]),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 4, 12).getValues(), [
            [  0,   1,   2,   3,   4, '', '',   5,   6,   7,   8,   9],   // row 4
            [-10, -11, -12, -13, -14, '', '', -15, -16, -17, -18, -19],   // row 5
            [-20, -21, -22, -23, -24, '', '', -25, -26, -27, -28, -29],   // row 6
            [ 30,  31,  32,  33,  34, '', '',  35,  36,  37,  38,  39],   // row 7
        ], 'write should affect requested columns (only)'),
    );

    await testCase(
        client => client.deleteRows(5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 3, 12).getValues(), [
            [ 0,  1,  2,  3,  4, '', '',  5,  6,  7,  8,  9],   // row 4
            [20, 21, 22, 23, 24, '', '', 25, 26, 27, 28, 29],   // row 5 (old 6)
            [30, 31, 32, 33, 34, '', '', 35, 36, 37, 38, 39],   // row 6 (old 7)
        ], 'row deletion should proceed unaffected'),
    );

    await testCase(
        client => client.insertRows(5),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 4, 12).getValues(), [
            [ 0,  1,  2,  3,  4, '', '',  5,  6,  7,  8,  9],   // row 4
            ['', '', '', '', '', '', '', '', '', '', '', ''],   // row 5 (new)
            [10, 11, 12, 13, 14, '', '', 15, 16, 17, 18, 19],   // row 6 (old 5)
            [20, 21, 22, 23, 24, '', '', 25, 26, 27, 28, 29],   // row 7 (old 6)
        ], 'row insertion should proceed unaffected'),
    );

    await testCase(
        client => client.deleteColumns(3),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 11).getValues(), [
            [ 0,  1,  3,  4, '', '',  5,  6,  7,  8,  9],   // row 4
            [10, 11, 13, 14, '', '', 15, 16, 17, 18, 19],   // row 5
        ], 'column deletion before should proceed unaffected'),
    );

    await testCase(
        client => client.deleteColumns(8),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 11).getValues(), [
            [ 0,  1,  2,  3,  4, '', '',  5,  6,  8,  9],   // row 4
            [10, 11, 12, 13, 14, '', '', 15, 16, 18, 19],   // row 5
        ], 'column deletion after should shift right'),
    );

    await testCase(
        //delete columns 5, 6, 7
        client => client.deleteColumns(5, 3),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 9).getValues(), [
            [ 0,  1,  2,  3, '', '',  7,  8,  9],   // row 4
            [10, 11, 12, 13, '', '', 17, 18, 19],   // row 5
        ], 'overlapping column deletion should not affect newly inserted columns'),
    );

    await testCase(
        client => client.insertColumns(4),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 13).getValues(), [
            [ 0,  1,  2, '',  3,  4, '', '',  5,  6,  7,  8,  9],   // row 4
            [10, 11, 12, '', 13, 14, '', '', 15, 16, 17, 18, 19],   // row 5
        ], 'column insertion before should not proceed unaffected'),
    );

    await testCase(
        client => client.insertColumns(8),
        ({ sheet }) => t.deepEqual(sheet.getRange(4, 1, 2, 13).getValues(), [
            [ 0,  1,  2,  3,  4, '', '',  5,  6, '',  7,  8,  9],   // row 4
            [10, 11, 12, 13, 14, '', '', 15, 16, '', 17, 18, 19],   // row 5
        ], 'column insertion after should shift right'),
    );
});
