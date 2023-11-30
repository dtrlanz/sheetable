import test from 'ava';
import { sheet } from "./util/sheet-navigation.js";

import { SheetServer } from "../src/sheet-server.js";
import { Branch } from '../src/headers.js';

const server = new SheetServer(sheet`
 A |    |  B |  C |     |     |     |  D |   E |  F |
A1 | A2 |    | C1 |  C2 |     |     |    |  E1 |    |
   |    |    |    | C21 | C22 | C23 |    | E11 |    |
 0 |  1 |  2 |  3 |   4 |   5 |   6 |  7 |   8 |  9 |
10 | 11 | 12 | 13 |  14 |  15 |  16 | 17 |  18 | 19 |
20 | 21 | 22 | 23 |  24 |  25 |  26 | 27 |  28 | 29 |
30 | 31 | 32 | 33 |  34 |  35 |  36 | 37 |  38 | 39 |
40 | 41 | 42 | 43 |  44 |  45 |  46 | 47 |  48 | 49 |
50 | 51 | 52 | 53 |  54 |  55 |  56 | 57 |  58 | 59 |
60 | 61 | 62 | 63 |  64 |  65 |  66 | 67 |  68 | 69 |
`);

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
    t.deepEqual(data0?.rows, server.sheet.getRange(1, 1, 10, 11).getValues());

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
    t.deepEqual(data1?.rows, server.sheet.getRange(1, 1, 10, 11).getValues());

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
    t.deepEqual(data2?.rows, server.sheet.getRange(1, 1, 10, 11).getValues());
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
    t.deepEqual(data0?.rows, server.sheet.getRange(4, 1, 7, 10).getValues());

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
    t.deepEqual(data1?.rows, server.sheet.getRange(4, 1, 7, 10).getValues());

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
    t.deepEqual(data2?.rows, server.sheet.getRange(4, 1, 7, 10).getValues());
});