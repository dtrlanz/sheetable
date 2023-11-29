import { SheetLike, RangeLike } from "../../src/sheet-navigation.js";

export class TestSheet implements SheetLike {
    _rows: (number | string | boolean | Date)[][];

    constructor(data: (number | string | boolean | Date)[][]) {
        this._rows = data;
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

const rowSeparator = '\n';
const columnSeparator = '|';

export function sheet(strings: TemplateStringsArray, ...expressions: any[]) {
    const rows: (number | string | boolean | Date)[][] = [[]];
    for (let i = 0; i < expressions.length; i++) {
        const str = i === 0 ? strings[i].trimStart() : strings[i];
        processString(str, i > 0, true, rows);
        let val = expressions[i];
        if (!(typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || 'toUTCString' in val)) {
            // convert to string if type unsupported
            val = `${val}`;
        }
        rows[rows.length - 1].push(val);
    }
    if (expressions.length > 0) {
        processString(strings[strings.length - 1].trimEnd(), true, false, rows);
    } else {
        processString(strings[strings.length - 1].trim(), false, false, rows);
    }
    
    return new TestSheet(rows);

    function processString(str: string, ignoreFirst: boolean, ignoreLast: boolean, data: (number | string | boolean | Date)[][]) {
        const vals = str.split(rowSeparator)
            .map(row => row.split(columnSeparator)
                .map(val => {
                    val = val.trim();
                    const num = Number.parseFloat(val);
                    if (!Number.isNaN(num)) {
                        return num;
                    }
                    return val;
                })
            );
        if (ignoreFirst) vals[0].shift();
        if (ignoreLast) vals[vals.length - 1].pop();
        // guaranteed to run at least one (vals.length >= 1)
        for (const row of vals) {
            const addTo = data[data.length - 1];
            for (const cell of row) {
                addTo.push(cell);
            }
            data.push([]);
        }
        // remove empty row that was just added after the last cycle
        data.pop();
    }
}
