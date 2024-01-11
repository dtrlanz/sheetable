import test from 'ava';
import { sheet } from "./util/sheet-navigation.js";
import { SpreadsheetServer } from "../src/server.js";
import { Branch } from '../src/headers.js';

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
const server = new SpreadsheetServer(sample);

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
    const { headers } = server.processRequest({
        orientation: 'normal',
        readHeaders: true
    });
    t.deepEqual(headers, expectedHeaders);
});

test('get all data (incl. header rows)', t => {
    const { data: data0, headers: headers0 } = server.processRequest({
        orientation: 'normal',
        readData: true
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 10).getValues());

    const { data: data1, headers: headers1 } = server.processRequest({
        orientation: 'normal',
        readData: {
            colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],    // 11 should be cropped
        },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data1?.rows, sample.getRange(1, 1, 10, 10).getValues());

    const { data: data2, headers: headers2 } = server.processRequest({
        orientation: 'normal',
        readData: {
            colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],    // 11 should be cropped
            colHeaders: ['A', 'B'], // should be ignored
        },
    });
    t.truthy(data2);
    t.falsy(headers2);
    t.is(data2?.rowOffset, 1);
    t.deepEqual(data2?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data2?.rows, sample.getRange(1, 1, 10, 10).getValues());
});

test('get all data (excl. header rows)', t => {
    const { data: data0, headers: headers0 } = server.processRequest({
        orientation: 'normal',
        readHeaders: true,
        readData: true,
    });
    t.truthy(data0);
    t.deepEqual(headers0, expectedHeaders);
    t.is(data0?.rowOffset, 4);
    t.deepEqual(data0?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data0?.rows, sample.getRange(4, 1, 7, 10).getValues());

    const { data: data1, headers: headers1 } = server.processRequest({
        orientation: 'normal',
        readHeaders: true,
        readData: {
            colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        },
    });
    t.truthy(data1);
    t.deepEqual(headers1, expectedHeaders);
    t.is(data1?.rowOffset, 4);
    t.deepEqual(data1?.colNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    t.deepEqual(data1?.rows, sample.getRange(4, 1, 7, 10).getValues());

    const { data: data2, headers: headers2 } = server.processRequest({
        orientation: 'normal',
        readData: {
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
    const { data: data0, headers: headers0 } = server.processRequest({
        orientation: 'normal',
        readData: {
            colNumbers: [1, 2, 3],
        },
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, [1, 2, 3]);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 3).getValues());

    const { data: data1, headers: headers1 } = server.processRequest({
        orientation: 'normal',
        readData: {
            colNumbers: [2, 3, 4, 5, 6, 7, 8, 9],
        },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, [2, 3, 4, 5, 6, 7, 8, 9]);
    t.deepEqual(data1?.rows, sample.getRange(1, 2, 10, 8).getValues());

    const { data: data2, headers: headers2 } = server.processRequest({
        orientation: 'normal',
        readData: {
            colNumbers: [7, 8, 9, 10, 11],  // 11 should be cropped
        },
    });
    t.truthy(data2);
    t.falsy(headers2);
    t.is(data2?.rowOffset, 1);
    t.deepEqual(data2?.colNumbers, [7, 8, 9, 10]);
    t.deepEqual(data2?.rows, sample.getRange(1, 7, 10, 4).getValues());
});

test('reorder contiguous columns', t => {
    let colNumbers = [3, 2, 1];
    const { data: data0, headers: headers0 } = server.processRequest({
        orientation: 'normal',
        readData: { colNumbers },
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, colNumbers);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 10).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [4, 5, 6, 2, 3, 7, 8, 9];
    const { data: data1, headers: headers1 } = server.processRequest({
        orientation: 'normal',
        readData: { colNumbers },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, colNumbers);
    t.deepEqual(data1?.rows, sample.getRange(1, 1, 10, 10).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [7, 8, 9, 10];
    const { data: data2, headers: headers2 } = server.processRequest({
        orientation: 'normal',
        readData: { colNumbers },
    });
    t.truthy(data2);
    t.falsy(headers2);
    t.is(data2?.rowOffset, 1);
    t.deepEqual(data2?.colNumbers, colNumbers);
    t.deepEqual(data2?.rows, sample.getRange(1, 1, 10, 10).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

});

test('repeat contiguous columns', t => {
    let colNumbers = [3, 2, 1, 2, 1];
    const { data: data0, headers: headers0 } = server.processRequest({
        orientation: 'normal',
        readData: { colNumbers },
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, colNumbers);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 10).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [7, 8, 9, 10, 7, 8, 9, 10];
    const { data: data1, headers: headers1 } = server.processRequest({
        orientation: 'normal',
        readData: { colNumbers },
    });
    t.truthy(data1);
    t.falsy(headers1);
    t.is(data1?.rowOffset, 1);
    t.deepEqual(data1?.colNumbers, colNumbers);
    t.deepEqual(data1?.rows, sample.getRange(1, 1, 10, 10).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));
});

test('select non-contiguous columns', t => {
    let colNumbers = [1, 4, 7];
    const { data: data0, headers: headers0 } = server.processRequest({
        orientation: 'normal',
        readData: { colNumbers },
    });
    t.truthy(data0);
    t.falsy(headers0);
    t.is(data0?.rowOffset, 1);
    t.deepEqual(data0?.colNumbers, colNumbers);
    t.deepEqual(data0?.rows, sample.getRange(1, 1, 10, 11).getValues()
        .map(row => colNumbers.map(n => row[n - 1])));

    colNumbers = [1, 4, 5, 6, 9, 10];
    const { data: data1, headers: headers1 } = server.processRequest({
        orientation: 'normal',
        readData: { colNumbers },
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
    const { data: data0, headers: headers0 } = server.processRequest({
        orientation: 'normal',
        readData: {
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
    const { data: data1, headers: headers1 } = server.processRequest({
        orientation: 'normal',
        readData: {
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
    const { data: data0, headers: headers0 } = server.processRequest({
        orientation: 'normal',
        readData: {
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
    const { data: data1, headers: headers1 } = server.processRequest({
        orientation: 'normal',
        readData: {
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

test('write data', t => {
    const testSheet = getSampleSheet();
    const server = new SpreadsheetServer(testSheet);
    function testValues() {
        return testSheet.getRange(1, 1, testSheet.getLastRow(), testSheet.getLastColumn()).getValues();
    }
    const expected = sample.getRange(1, 1, sample.getLastRow(), sample.getLastColumn()).getValues();

    t.deepEqual(testValues(), expected);

    // without supplying column numbers; too little data to fill row -> ok
    server.processRequest({ orientation: 'normal', writeData: {
        rowStart: 4,
        rows: [[500, 501, 502, 503]],
    }});
    expected[3] = [500, 501, 502, 503, 4, 5, 6, 7, 8, 9];
    t.deepEqual(testValues(), expected);

    // without supplying column numbers; too much data -> truncated
    server.processRequest({ orientation: 'normal', writeData: {
        rowStart: 4,
        rows: [[300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313]],
    }});
    expected[3] = [300, 301, 302, 303, 304, 305, 306, 307, 308, 309];
    t.deepEqual(testValues(), expected);

    // without supplying column numbers; data width matches row width -> ok
    server.processRequest({ orientation: 'normal', writeData: {
        rowStart: 4,
        rows: [[100, 101, 102, 103, 104, 105, 106, 107, 108, 109]],
    }});
    expected[3] = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
    t.deepEqual(testValues(), expected);

    // without supplying column numbers; no data -> ok, no effect
    server.processRequest({ orientation: 'normal', writeData: {
        rowStart: 4,
        rows: [[]],
    }});
    expected[3] = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
    t.deepEqual(testValues(), expected);

    // with supplying column numbers
    server.processRequest({ orientation: 'normal', writeData: {
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        rowStart: 7,
        rows: [[200, 201, 202, 203, 204, 205, 206, 207, 208, 209]],
    }});
    expected[6] = [200, 201, 202, 203, 204, 205, 206, 207, 208, 209];
    t.deepEqual(testValues(), expected);

    // non-contiguous column numbers
    server.processRequest({ orientation: 'normal', writeData: {
        colNumbers: [2, 3, 6, 10, 8, 9],
        rowStart: 6,
        rows: [[301, 302, 305, 309, 307, 308]],
    }});
    expected[5] = [20, 301, 302, 23, 24, 305, 26, 307, 308, 309];
    t.deepEqual(testValues(), expected);

    // multiple rows, with supplying column numbers
    server.processRequest({ orientation: 'normal', writeData: {
        colNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        rowStart: 7,
        rows: [
            [210, 211, 212, 213, 214, 215, 216, 217, 218, 219],
            [310, 311, 312, 313, 314, 315, 316, 317, 318, 319],
            [410, 411, 412, 413, 414, 415, 416, 417, 418, 419],
        ],
    }});
    expected[6] = [210, 211, 212, 213, 214, 215, 216, 217, 218, 219];
    expected[7] = [310, 311, 312, 313, 314, 315, 316, 317, 318, 319];
    expected[8] = [410, 411, 412, 413, 414, 415, 416, 417, 418, 419];
    t.deepEqual(testValues(), expected);

    // multiple rows, non-contiguous column numbers
    server.processRequest({ orientation: 'normal', writeData: {
        colNumbers: [2, 3, 6, 10, 8, 9],
        rowStart: 6,
        rows: [
            [311, 312, 315, 319, 317, 318],
            [411, 412, 415, 419, 417, 418],
            [511, 512, 515, 519, 517, 518],
            [611, 612, 615, 619, 617, 618],
        ],
    }});
    expected[5] = [ 20, 311, 312,  23,  24, 315,  26, 317, 318, 319];
    expected[6] = [210, 411, 412, 213, 214, 415, 216, 417, 418, 419];
    expected[7] = [310, 511, 512, 313, 314, 515, 316, 517, 518, 519];
    expected[8] = [410, 611, 612, 413, 414, 615, 416, 617, 618, 619];
    t.deepEqual(testValues(), expected);
    
    // values outside of the given region are ignored (contiguous columns)
    server.processRequest({ orientation: 'normal', writeData: {
        colNumbers: [9, 10, 11, 12, 13],
        rowStart: 9,
        rows: [
            [0, 1, 2, 3, 4],
            [5, 6, 7, 8, 9],
            [10, 11, 12, 13, 14],
            [15, 16, 17, 18, 19],
        ],
    }});
    expected[8] = [410, 611, 612, 413, 414, 615, 416, 617, 0, 1];
    expected[9] = [ 60,  61,  62,  63,  64,  65,  66,  67, 5, 6];
    t.deepEqual(testValues(), expected);

    // values outside of the given region are ignored (non-contiguous columns)
    server.processRequest({ orientation: 'normal', writeData: {
        colNumbers: [9, 11, 13],
        rowStart: 9,
        rows: [
            [30, 32, 34],
            [35, 37, 39],
            [40, 42, 44],
            [45, 47, 49],
        ],
    }});
    expected[8] = [410, 611, 612, 413, 414, 615, 416, 617, 30, 1];
    expected[9] = [ 60,  61,  62,  63,  64,  65,  66,  67, 35, 6];
    t.deepEqual(testValues(), expected);
});