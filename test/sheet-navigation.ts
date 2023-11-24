import test from 'ava';

import { SheetLike, RangeLike } from "../src/sheet-navigation.js";
export { Region, TableWalker } from "../src/sheet-navigation.js";

export class TestSheet implements SheetLike {
    _rows: (number | string | boolean | Date)[][];

    constructor(rows: (number | string | boolean | Date)[][]) {
        this._rows = rows;
    }

    getLastColumn(): number {
        return this._rows[0].length;
    }

    getLastRow(): number {
        return this._rows.length;
    }

    getRange(row: number, colunn: number, numRows?: number, numColumns?: number): RangeLike {
        return new TestRange(this, row, colunn, numRows, numColumns);
    }

    insertColumns(columnIndex: number, numColumns?: number) {
        throw new Error('TestSheet.insertColumns() is not yet implemented');
    }

    insertRows(rowIndex: number, numRows?: number) {
        throw new Error('TestSheet.insertRows() is not yet implemented');
    }
}

export class TestRange implements RangeLike {
    sheet: TestSheet;
    row: number;
    colunn: number;
    numRows: number;
    numColumns: number;

    constructor(sheet: TestSheet, row: number, colunn: number, numRows?: number, numColumns?: number) {
        this.sheet = sheet;
        this.row = row;
        this.colunn = colunn;
        this.numRows = numRows ?? 1;
        this.numColumns = numColumns ?? 1;
    }

    getValue(): any {
        return this.sheet._rows[this.row - 1][this.colunn - 1];
    }

    getValues(): any[][] {
        return this.sheet._rows.slice(this.row - 1, this.row - 1 + this.numRows)
            .map(row => row.slice(this.colunn - 1, this.colunn - 1 + this.numColumns));
    }

    setValue(value: number | string | boolean | Date): void {
        this.sheet._rows[this.row - 1][this.colunn - 1] = value;
    }

    setValues(values: (number | string | boolean | Date)[][]): void {
        if (values.length !== this.numRows) {
            throw new Error('number of rows does not match');
        }
        for (const row of values) {
            if (row.length !== this.numColumns) {
                throw new Error('number of columns does not match');
            }
        }

        for (let i = 0; i < values.length; i++) {
            this.sheet._rows[this.row - 1 + i].splice(this.colunn - 1, this.numColumns, ...values[i]);
        }
    }
}

function s1x1() {
    return new TestSheet([[0]]);
}

function s3x1() {
    return new TestSheet([[0], [1], [2]]);
}

function s1x3() {
    return new TestSheet([
        [0, 1, 2]
    ]);
}

function s3x3() {
    return new TestSheet([
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8]
    ]);
}

test('get last column', t => {
    t.is(s1x1().getLastColumn(), 1);
    t.is(s3x1().getLastColumn(), 1);
    t.is(s1x3().getLastColumn(), 3);
    t.is(s3x3().getLastColumn(), 3);
});

test('get last row', t => {
    t.is(s1x1().getLastRow(), 1);
    t.is(s3x1().getLastRow(), 3);
    t.is(s1x3().getLastRow(), 1);
    t.is(s3x3().getLastRow(), 3);
});

test('get value', t => {
    const r0a = s1x1().getRange(1, 1);
    const r0b = s3x3().getRange(1, 1);
    const r0_3 = s3x3().getRange(1, 1, 2);
    const r01 = s3x3().getRange(1, 1, undefined, 2);
    const r01_34 = s3x3().getRange(1, 1, 2, 2);
    const r45_78 = s3x3().getRange(2, 2, 2, 2);
    const r78 = s3x3().getRange(3, 2, 1, 2);
    t.is(r0a.getValue(), 0);
    t.is(r0b.getValue(), 0);
    t.is(r01.getValue(), 0);
    t.is(r0_3.getValue(), 0);
    t.is(r01_34.getValue(), 0);
    t.is(r45_78.getValue(), 4);
    t.is(r78.getValue(), 7);
});

test('get values', t => {
    const r0a = s1x1().getRange(1, 1);
    const r0b = s3x3().getRange(1, 1);
    const r0_3 = s3x3().getRange(1, 1, 2);
    const r01 = s3x3().getRange(1, 1, undefined, 2);
    const r01_34 = s3x3().getRange(1, 1, 2, 2);
    const r45_78 = s3x3().getRange(2, 2, 2, 2);
    const r78 = s3x3().getRange(3, 2, 1, 2);
    t.deepEqual(r0a.getValues(), [[0]]);
    t.deepEqual(r0b.getValues(), [[0]]);
    t.deepEqual(r0_3.getValues(), [[0], [3]]);
    t.deepEqual(r01.getValues(), [[0, 1]]);
    t.deepEqual(r01_34.getValues(), [[0, 1], [3, 4]]);
    t.deepEqual(r45_78.getValues(), [[4, 5], [7, 8]]);
    t.deepEqual(r78.getValues(), [[7, 8]]);
});

test('set value', t => {
    const s1x1a = s1x1();
    const s3x3a = s3x3();
    const s3x3b = s3x3();
    const r0a = s1x1a.getRange(1, 1);
    const r0ba = s3x3a.getRange(1, 1);
    const r0_3a = s3x3a.getRange(1, 1, 2);
    const r01a = s3x3a.getRange(1, 1, undefined, 2);
    const r01_34a = s3x3a.getRange(1, 1, 2, 2);
    const r01_34b = s3x3b.getRange(1, 1, 2, 2);
    const r45_78b = s3x3b.getRange(2, 2, 2, 2);
    const r012_345_678 = s3x3b.getRange(1, 1, 3, 3);
    r0a.setValue('x');
    r0ba.setValue('x');
    r45_78b.setValue('x');
    t.deepEqual(r0a.getValues(), [['x']]);
    t.deepEqual(r0ba.getValues(), [['x']]);
    t.deepEqual(r0_3a.getValues(), [['x'], [3]]);
    t.deepEqual(r01a.getValues(), [['x', 1]]);
    t.deepEqual(r01_34a.getValues(), [['x', 1], [3, 4]]);
    t.deepEqual(r01_34b.getValues(), [[0, 1], [3, 'x']]);
    t.deepEqual(r45_78b.getValues(), [['x', 5], [7, 8]]);
    t.deepEqual(r012_345_678.getValues(), [[0, 1, 2], [3, 'x', 5], [6, 7, 8]]);
});

test('set values', t => {
    const s1x1a = s1x1();
    const s3x3a = s3x3();
    const s3x3b = s3x3();
    const r0a = s1x1a.getRange(1, 1);
    const r0ba = s3x3a.getRange(1, 1);
    const r0_3a = s3x3a.getRange(1, 1, 2);
    const r01a = s3x3a.getRange(1, 1, undefined, 2);
    const r01_34a = s3x3a.getRange(1, 1, 2, 2);
    const r01_34b = s3x3b.getRange(1, 1, 2, 2);
    const r45_78b = s3x3b.getRange(2, 2, 2, 2);
    const r012_345_678 = s3x3b.getRange(1, 1, 3, 3);
    r0a.setValues([['x']]);
    r0ba.setValues([['x']]);
    r45_78b.setValues([['x', 'y'], ['z', 'q']]);
    t.deepEqual(r0a.getValues(), [['x']]);
    t.deepEqual(r0ba.getValues(), [['x']]);
    t.deepEqual(r0_3a.getValues(), [['x'], [3]]);
    t.deepEqual(r01a.getValues(), [['x', 1]]);
    t.deepEqual(r01_34a.getValues(), [['x', 1], [3, 4]]);
    t.deepEqual(r01_34b.getValues(), [[0, 1], [3, 'x']]);
    t.deepEqual(r45_78b.getValues(), [['x', 'y'], ['z', 'q']]);
    t.deepEqual(r012_345_678.getValues(), [[0, 1, 2], [3, 'x', 'y'], [6, 'z', 'q']]);
    t.throws(() => {
        r45_78b.setValues([['x', 'y', 'z']]);
    });
    t.throws(() => {
        r45_78b.setValues([['x'], ['y'], ['z']]);
    });
    t.throws(() => {
        r45_78b.setValues([[0, 1, 2], [3, 4], [6, 7, 8]]);
    });
});
