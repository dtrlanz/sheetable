import test from 'ava';
import { sheet } from "./util/sheet-navigation.js";

import { SheetClient, SheetServer } from "../src/sheet-server.js";
import { Branch } from '../src/headers.js';

const sample = sheet`
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
const server = new SheetServer(sample);

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

test('get headers', t => {
    const { headers } = server.request({
        orientation: 'normal',
        getHeaders: true
    });
    t.deepEqual(headers, expectedHeaders);
});

test('get all data (incl. header rows)', t => {
    const { data: data0, headers: headers0 } = server.request({
        orientation: 'normal',
        getData: true
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 11).getValues());

    const { data: data1, headers: headers1 } = server.request({
        orientation: 'normal',
        getData: {
            colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    t.deepEqual(data1?.rows, sample.getRange(1, 1, 10, 11).getValues());

    const { data: data2, headers: headers2 } = server.request({
        orientation: 'normal',
        getData: {
            colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            colHeaders: ['A', 'B'], // should be ignored
        },
    });
    t.truthy(data2);
    t.falsy(headers2);
    t.is(data2?.rowOffset, 1);
    t.deepEqual(data2?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    t.deepEqual(data2?.rows, sample.getRange(1, 1, 10, 11).getValues());
});

test('get all data (excl. header rows)', t => {
    const { data: data0, headers: headers0 } = server.request({
        orientation: 'normal',
        getHeaders: true,
        getData: true,
    });
    t.truthy(data0);
    t.deepEqual(headers0, expectedHeaders);
    t.is(data0?.rowOffset, 4);
    t.deepEqual(data0?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data0?.rows, sample.getRange(4, 1, 7, 10).getValues());

    const { data: data1, headers: headers1 } = server.request({
        orientation: 'normal',
        getHeaders: true,
        getData: {
            colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        },
    });
    t.truthy(data1);
    t.deepEqual(headers1, expectedHeaders);
    t.is(data1?.rowOffset, 4);
    t.deepEqual(data1?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data1?.rows, sample.getRange(4, 1, 7, 10).getValues());

    const { data: data2, headers: headers2 } = server.request({
        orientation: 'normal',
        getData: {
            colHeaders: ['A', 'B', 'C', 'D', 'E', 'F'],
        },
    });
    t.truthy(data2);
    t.deepEqual(headers2, expectedHeaders);
    t.is(data2?.rowOffset, 4);
    t.deepEqual(data2?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data2?.rows, sample.getRange(4, 1, 7, 10).getValues());
});

test('select contiguous columns', t => {
    const { data: data0, headers: headers0 } = server.request({
        orientation: 'normal',
        getData: {
            colNumbers: [1, 2, 3],
        },
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, [1, 2, 3]);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 3).getValues());

    const { data: data1, headers: headers1 } = server.request({
        orientation: 'normal',
        getData: {
            colNumbers: [2, 3, 4, 5, 6, 7, 8, 9],
        },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, [2, 3, 4, 5, 6, 7, 8, 9]);
    t.deepEqual(data1?.rows, sample.getRange(1, 2, 10, 8).getValues());

    const { data: data2, headers: headers2 } = server.request({
        orientation: 'normal',
        getData: {
            colNumbers: [7, 8, 9, 10, 11],
        },
    });
    t.truthy(data2);
    t.falsy(headers2);
    t.is(data2?.rowOffset, 1);
    t.deepEqual(data2?.colNumbers, [7, 8, 9, 10, 11]);
    t.deepEqual(data2?.rows, sample.getRange(1, 7, 10, 5).getValues());
});

test('reorder contiguous columns', t => {
    let colNumbers = [3, 2, 1];
    const { data: data0, headers: headers0 } = server.request({
        orientation: 'normal',
        getData: { colNumbers },
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, colNumbers);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [4, 5, 6, 2, 3, 7, 8, 9];
    const { data: data1, headers: headers1 } = server.request({
        orientation: 'normal',
        getData: { colNumbers },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, colNumbers);
    t.deepEqual(data1?.rows, sample.getRange(1, 1, 10, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [11, 7, 8, 9, 10];
    const { data: data2, headers: headers2 } = server.request({
        orientation: 'normal',
        getData: { colNumbers },
    });
    t.truthy(data2);
    t.falsy(headers2);
    t.is(data2?.rowOffset, 1);
    t.deepEqual(data2?.colNumbers, colNumbers);
    t.deepEqual(data2?.rows, sample.getRange(1, 1, 10, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

});

test('repeat contiguous columns', t => {
    let colNumbers = [3, 2, 1, 2, 1];
    const { data: data0, headers: headers0 } = server.request({
        orientation: 'normal',
        getData: { colNumbers },
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, colNumbers);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [7, 8, 9, 10, 11, 7, 8, 9, 10, 11];
    const { data: data1, headers: headers1 } = server.request({
        orientation: 'normal',
        getData: { colNumbers },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, colNumbers);
    t.deepEqual(data1?.rows, sample.getRange(1, 1, 10, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));
});

test('select non-contiguous columns', t => {
    let colNumbers = [1, 4, 7];
    const { data: data0, headers: headers0 } = server.request({
        orientation: 'normal',
        getData: { colNumbers },
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, colNumbers);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [1, 4, 5, 6, 9, 10];
    const { data: data1, headers: headers1 } = server.request({
        orientation: 'normal',
        getData: { colNumbers },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, colNumbers);
    t.deepEqual(data1?.rows, sample.getRange(1, 1, 10, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));
});

test('select contiguous headers', t => {
    let colNumbers = [1, 2, 3];
    const { data: data0, headers: headers0 } = server.request({
        orientation: 'normal',
        getData: {
            colHeaders: ['A', 'B'],
        },
    });
    t.truthy(data0);
    t.deepEqual(headers0, expectedHeaders);
    t.is(data0?.rowOffset, 4);
    t.deepEqual(data0?.colNumbers, colNumbers);
    t.deepEqual(data0?.rows, sample.getRange(4, 1, 7, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [4, 5, 6, 7];
    const { data: data1, headers: headers1 } = server.request({
        orientation: 'normal',
        getData: {
            colHeaders: ['C'],
        },
    });
    t.truthy(data1);
    t.deepEqual(headers1, expectedHeaders);
    t.is(data1?.rowOffset, 4);
    t.deepEqual(data1?.colNumbers, colNumbers);
    t.deepEqual(data1?.rows, sample.getRange(4, 1, 7, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));});

test('select non-contiguous headers', t => {
    let colNumbers = [1, 2, 4, 5, 6, 7];
    const { data: data0, headers: headers0 } = server.request({
        orientation: 'normal',
        getData: {
            colHeaders: ['A', 'C'],
        },
    });
    t.truthy(data0);
    t.deepEqual(headers0, expectedHeaders);
    t.is(data0?.rowOffset, 4);
    t.deepEqual(data0?.colNumbers, colNumbers);
    t.deepEqual(data0?.rows, sample.getRange(4, 1, 7, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [8, 10];
    const { data: data1, headers: headers1 } = server.request({
        orientation: 'normal',
        getData: {
            colHeaders: ['D', 'F'],
        },
    });
    t.truthy(data1);
    t.deepEqual(headers1, expectedHeaders);
    t.is(data1?.rowOffset, 4);
    t.deepEqual(data1?.colNumbers, colNumbers);
    t.deepEqual(data1?.rows, sample.getRange(4, 1, 7, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));
});

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
    t.deepEqual(data0?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 11).getValues());
    
    const data1 = await client.getRows(4, 11);
    t.is(data1?.rowOffset, 4);
    t.deepEqual(data1?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    t.deepEqual(data1?.rows, sample.getRange(4, 1, 7, 11).getValues());

    const data = await client.getRows(7, 9);
    t.is(data?.rowOffset, 7);
    t.deepEqual(data?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    t.deepEqual(data?.rows, sample.getRange(7, 1, 2, 11).getValues());
});
