export type Orientation = 'normal' | 'transposed';

export class Region {
    readonly sheet: Sheet;
    readonly orientation: Orientation;
    readonly colStart: number;
    readonly colStop: number;
    readonly rowStart: number;
    readonly rowStop: number;

    constructor(sheet: Sheet, rowStart: number, rowStop: number, colStart: number, colStop: number, orientation: Orientation) {
        this.sheet = sheet;
        this.orientation = orientation;
        this.colStart = colStart;
        this.colStop = colStop;
        this.rowStart = rowStart;
        this.rowStop = rowStop;
    }

    static fromSheet(sheet: Sheet, orientation: Orientation = 'normal'): Region {
        let rowStop = sheet.getLastRow() + 1;
        let colStop = sheet.getLastColumn() + 1;
        if (orientation === 'transposed') [colStop, rowStop] = [rowStop, colStop];
        return new Region(sheet, 1, rowStop, 1, colStop, orientation);
    }

    resize(rowStart?: number, rowStop?: number, colStart?: number, colStop?: number): Region {
        rowStart ??= this.rowStart;
        rowStop ??= this.rowStop;
        colStart ??= this.colStart;
        colStop ??= this.colStop;
        return new Region(this.sheet, 1, rowStop, 1, colStop, this.orientation);
    }

    read(row: number, col: number): any {
        if (row < this.rowStart || row >= this.rowStop || col < this.colStart || col >= this.colStop) 
            return undefined;

        if (this.orientation === 'normal') {
            return this.sheet.getRange(row, col).getValue();
        } else {
            return this.sheet.getRange(col, row).getValue();
        }
    }

    write(row: number, col: number, value: any) {
        if (this.orientation === 'normal') {
            return this.sheet.getRange(row, col).setValue(value);
        } else {
            return this.sheet.getRange(col, row).setValue(value);
        }
    }

    readRow(row: number): any[] | undefined {
        if (row < this.rowStart || row >= this.rowStop)
            return undefined;

        if (this.orientation === 'normal') {
            return this.sheet.getRange(row, this.colStart, 1, this.colStop - this.colStart)
                .getValues()[0];
        } else {
            return this.sheet.getRange(this.colStart, row, this.colStop - this.colStart, 1)
                .getValues()
                .map(r => r[0]);
        }
    }

    writeRow(row: number, data: any[], onEnd: 'skip' | 'insert' | 'encroach'): Region {
        let r: Region | undefined;
        if (row >= this.rowStop) {
            if (onEnd === 'skip') return this;
            if (onEnd === 'insert') {
                if (this.orientation === 'normal') {
                    this.sheet.insertRows(this.rowStop, row - this.rowStop + 1)
                } else {
                    this.sheet.insertColumns(this.rowStop, row - this.rowStop + 1)
                }
            }
            r = this.resize(undefined, row + 1);
        }
        if (this.orientation === 'normal') {
            this.sheet.getRange(row, this.colStart, 1, this.colStop - this.colStart)
                .setValues([data]);
        } else {
            this.sheet.getRange(this.colStart, row, this.colStop - this.colStart, 1)
                .setValues(data.map(v => [v]));
        }
        return r ?? this;
    }

    readAll(): any[][] {
        if (this.orientation === 'normal') {
            return this.sheet.getRange(this.rowStart, this.colStart, 
                this.rowStop - this.rowStart, this.colStop - this.colStart)
                .getValues();
        } else {
            const data = this.sheet.getRange(this.colStart, this.rowStart, 
                this.colStop - this.colStart, this.rowStop - this.rowStart)
                .getValues();
            const transposed = [];
            for (let i = 0; i < this.rowStop - this.rowStart; i++) {
                transposed.push(data.map(col => col[i]));
            }
            return transposed;
        }
    }
}

export class TableWalker {
    readonly region: Region;
    readonly row: number;
    readonly col: number;

    constructor(region: Region, row?: number, col?: number) {
        this.region = region;
        this.row = row ?? 1;
        this.col = col ?? 1;
    }

    static fromSheet(sheet: Sheet, orientation: Orientation = 'normal'): TableWalker {
        return new TableWalker(Region.fromSheet(sheet, orientation));
    }

    move(row: number, col: number): TableWalker | undefined {
        const c = this.col + col;
        const r = this.row + row;
        if (this.region.colStart <= c && c < this.region.colStop 
            && this.region.rowStart <= r && r < this.region.rowStop) 
        {
            return new TableWalker(this.region, r, c);
        }
        return undefined;
    }

    crop(rowStart?: number, rowStop?: number, colStart?: number, colStop?: number): TableWalker | undefined {
        rowStart ??= this.region.rowStart;
        rowStop ??= this.region.rowStop;
        colStart ??= this.region.colStart;
        colStop ??= this.region.colStop;
        if (rowStart <= this.row && this.row < rowStop 
            && colStart <= this.col && this.col < colStop) 
        {
            return new TableWalker(new Region(this.region.sheet, rowStart, rowStop, 1, colStop, this.region.orientation), this.row, this.col);
        }
        return undefined;
    }

    find(rowDelta: number, colDelta: number, predicate: (v: any) => boolean): TableWalker | undefined {
        let cur: TableWalker | undefined = this;
        while (cur) {
            if (predicate(cur.value)) return cur;
            cur = cur.move(rowDelta, colDelta);
        }
        return undefined;
    }

    findAll(rowDelta: number, colDelta: number, predicate: (v: any) => boolean): TableWalker[] {
        const arr: TableWalker[] = [];
        let cur: TableWalker | undefined = this;
        while (cur) {
            if (predicate(cur.value)) arr.push(cur);
            cur = cur.move(rowDelta, colDelta);
        }
        return arr;
    }

    map<T>(rowDelta: number, colDelta: number, callback: (v: any) => T): T[] {
        const arr: T[] = [];
        let cur: TableWalker | undefined = this;
        while (cur) {
            arr.push(callback(cur.value));
            cur = cur.move(rowDelta, colDelta);
        }
        return arr;
    }

    get value() {
        return this.region.read(this.row, this.col);
    }
}