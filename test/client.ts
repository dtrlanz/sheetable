import test from 'ava';
import { sheet } from "./util/sheet-navigation.js";
import { Branch } from '../src/headers.js';
import { SheetClient, SheetEventParams } from '../src/client.js';

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
    const { headers: headers0, data: data0 } = await client.get('none');
    t.deepEqual(headers0, expectedHeaders);
    t.is(data0, undefined);

    const { headers: headers1, data: data1 } = await client.get('all');
    t.deepEqual(headers1, expectedHeaders);
    t.is(data1?.rowOffset, 4);
    t.deepEqual(data1?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data1?.rows, sample.getRange(4, 1, 7, 10).getValues());
    
    const { headers: headers2, data: data2 } = await client.get(['A', 'B', 'C', 'D', 'E', 'F']);
    t.deepEqual(headers2, expectedHeaders);
    t.deepEqual(data2?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data2?.rows, sample.getRange(4, 1, 7, 10).getValues());

    const { headers: headers3, data: data3 } = await client.get(['A', 'C']);
    t.deepEqual(headers3, expectedHeaders);
    t.deepEqual(data3?.colNumbers, [1, 2, 4, 5, 6, 7]);
    t.deepEqual(data3?.rows, sample.getRange(4, 1, 7, 11).getValues()
        .map(row => [1, 2, 4, 5, 6, 7].map(n => row[n - 1])));
});

test('client get rows', async t => {
    const client = SheetClient.fromSheet(sample);
    const data0 = await client.getRows();
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 10).getValues());
    
    const data1 = await client.getRows(4, 11);
    t.is(data1?.rowOffset, 4);
    t.deepEqual(data1?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data1?.rows, sample.getRange(4, 1, 7, 10).getValues());

    const data = await client.getRows(7, 9);
    t.is(data?.rowOffset, 7);
    t.deepEqual(data?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data?.rows, sample.getRange(7, 1, 2, 10).getValues());
});

test.only('client write row data', async t => {
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
    const beforeInsertingRows = client.getRows(6, 7);
    const insertRows = client.insertRows(5, 2);
    const afterInsertingRows = client.getRows(6, 7);
    t.deepEqual(await beforeInsertingRows, {
        rows: [[20, 21, 22, 23, 24, 25, 26, 27, 28, 29]],
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        rowOffset: 6,
    });
    await insertRows;
    // confirm that event fired
    t.deepEqual(eventArgs.at(-1), ['inserted', 'rows', 5, 2]);
    // confirm that request was updated
    t.deepEqual(client['requestsSent'][0].request.readData, {
        rowStart: 8,    // originally 6
        rowStop: 9,     // originally 7
    });
    // confirm that the data retrieved is what was originally in row 6 (now row 8)
    t.deepEqual(await afterInsertingRows, {
        rows: [[20, 21, 22, 23, 24, 25, 26, 27, 28, 29]],
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        rowOffset: 8,
    });

    // Delete rows
    const beforeDeletingRows = client.getRows(7, 8);
    const deleteRows = client.deleteRows(5, 2);
    const afterDeletingRows = client.getRows(7, 8);
    t.deepEqual(await beforeDeletingRows, {
        rows: [[10, 11, 12, 13, 14, 15, 16, 17, 18, 19]],
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        rowOffset: 7,
    });
    await deleteRows;
    // confirm that event fired
    t.deepEqual(eventArgs.at(-1), ['deleted', 'rows', 5, 2]);
    // confirm that request was updated
    t.deepEqual(client['requestsSent'][0].request.readData, {
        rowStart: 5,    // originally 7
        rowStop: 6,     // originally 8
    });
    // confirm that the data retrieved is what was originally in row 7 (now row 5)
    t.deepEqual(await afterDeletingRows, {
        rows: [[10, 11, 12, 13, 14, 15, 16, 17, 18, 19]],
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        rowOffset: 5,
    });

    // Insert columns
    const beforeInsertingColumns = client.getRows(6, 7);
    const insertColumns = client.insertColumns(5, 2);
    const afterInsertingColumns = client.getRows(6, 7);
    t.deepEqual(await beforeInsertingColumns, {
        rows: [[20, 21, 22, 23, 24, 25, 26, 27, 28, 29]],
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        rowOffset: 6,
    });
    await insertColumns;
    // confirm that event fired
    t.deepEqual(eventArgs.at(-1), ['inserted', 'columns', 5, 2]);
    // confirm that request was updated
    t.deepEqual(client['requestsSent'][0].request.limit, {
        rowStart: 6,
        rowStop: 7,
        colStart: 1,
        colStop: 13,    // originally 11
    });
    // confirm that the data retrieved reflects the column insertion
    t.deepEqual(await afterInsertingColumns, {
        rows: [[20, 21, 22, 23, undefined, undefined, 24, 25, 26, 27, 28, 29]],
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        rowOffset: 6,
    });

    // Delete columns
    const beforeDeletingColumns = client.getRows(6, 7);
    const deleteColumns = client.deleteColumns(5, 2);
    const afterDeletingColumns = client.getRows(6, 7);
    t.deepEqual(await beforeDeletingColumns, {
        rows: [[20, 21, 22, 23, undefined, undefined, 24, 25, 26, 27, 28, 29]],
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        rowOffset: 6,
    });
    await deleteColumns;
    // confirm that event fired
    t.deepEqual(eventArgs.at(-1), ['deleted', 'columns', 5, 2]);
    // confirm that request was updated
    t.deepEqual(client['requestsSent'][0].request.limit, {
        rowStart: 6,
        rowStop: 7,
        colStart: 1,
        colStop: 11,    // originally 13
    });
    // confirm that the data retrieved reflects the column deletion
    t.deepEqual(await afterDeletingColumns, {
        rows: [[20, 21, 22, 23, 24, 25, 26, 27, 28, 29]],
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        rowOffset: 6,
    });
});