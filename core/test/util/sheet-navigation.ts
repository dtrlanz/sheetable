import { SheetLike, RangeLike } from "../../lib/sheet-navigation.js";

export class TestSheet implements SheetLike {
    _rows: (number | string | boolean | Date)[][];
    _name: string;

    constructor(data: (number | string | boolean | Date)[][], name?: string) {
        this._rows = data;
        this._name = name ?? 'TestSheet';
    }

    getLastColumn(): number {
        return this._rows.reduce((max, row) => {
            if (!row) return max;
            for (let i = row.length - 1; i >= max; i--) {
                const val = row[i];
                if (val != undefined && val !== '') return i + 1;
            }
            return max;
        }, 0);
    }

    getLastRow(): number {
        for (let i = this._rows.length - 1; i >= 0; i--) {
            let row = this._rows[i];
            if (row && row.findIndex(val => val != undefined && val !== '') !== -1) {
                return i + 1;
            }
        }
        return 0;
    }

    getName(): string {
        return this._name;
    }

    getRange(row: number, column: number, numRows?: number, numColumns?: number): RangeLike {
        return new TestRange(this, row, column, numRows, numColumns);
    }

    insertColumns(columnPosition: number, numColumns: number = 1) {
        this._rows.forEach(row => {
            if (row) row.splice(columnPosition - 1, 0, ...new Array(numColumns));
        });
    }

    insertRows(rowPosition: number, numRows: number = 1) {
        this._rows.splice(rowPosition - 1, 0, ...new Array(numRows));
    }

    deleteColumns(columnPosition: number, numColumns: number = 1) {
        this._rows.forEach(row => {
            if (row) row.splice(columnPosition - 1, numColumns);
        });
    }

    deleteRows(rowPosition: number, numRows: number = 1) {
        this._rows.splice(rowPosition - 1, numRows);
    }

    setName(name: string) {
        this._name = name;
    }
}

export class TestRange implements RangeLike {
    sheet: TestSheet;
    row: number;
    column: number;
    numRows: number;
    numColumns: number;

    constructor(sheet: TestSheet, row: number, colunn: number, numRows?: number, numColumns?: number) {
        this.sheet = sheet;
        this.row = row;
        this.column = colunn;
        this.numRows = numRows ?? 1;
        this.numColumns = numColumns ?? 1;
    }

    getValue(): any {
        return this.sheet._rows[this.row - 1]?.[this.column - 1] ?? '';
    }

    getValues(): any[][] {
        const arr = [];
        for (let rIdx = 0; rIdx < this.numRows; rIdx++) {
            const row = []
            for (let cIdx = 0; cIdx < this.numColumns; cIdx++) {
                row.push(this.sheet._rows[rIdx + this.row - 1]?.[cIdx + this.column - 1] ?? '');
            }
            arr.push(row);
        }
        return arr;
    }

    setValue(value: number | string | boolean | Date): void {
        let row = this.sheet._rows.at(this.row - 1);
        if (!row) {
            row = this.sheet._rows[this.row - 1] = [];
        }
        row[this.column - 1] = value;
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

        for (let rIdx = 0; rIdx < values.length; rIdx++) {
            let row = this.sheet._rows[this.row - 1 + rIdx];
            if (!row) {
                row = this.sheet._rows[this.row - 1 + rIdx] = [];
            }
            row.splice(this.column - 1, this.numColumns, ...values[rIdx]);
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
