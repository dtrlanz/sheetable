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

