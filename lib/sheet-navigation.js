export class Region {
    sheet;
    orientation;
    colStart;
    colStop;
    rowStart;
    rowStop;
    constructor(sheet, rowStart, rowStop, colStart, colStop, orientation) {
        this.sheet = sheet;
        this.orientation = orientation;
        this.colStart = colStart;
        this.colStop = colStop;
        this.rowStart = rowStart;
        this.rowStop = rowStop;
    }
    static fromSheet(sheet, orientation = 'normal') {
        let rowStop = sheet.getLastRow() + 1;
        let colStop = sheet.getLastColumn() + 1;
        if (orientation === 'transposed')
            [colStop, rowStop] = [rowStop, colStop];
        return new Region(sheet, 1, rowStop, 1, colStop, orientation);
    }
    // may be depracated in favor of `crop()`
    resize(rowStart, rowStop, colStart, colStop) {
        rowStart ??= this.rowStart;
        rowStop ??= this.rowStop;
        colStart ??= this.colStart;
        colStop ??= this.colStop;
        return new Region(this.sheet, rowStart, rowStop, colStart, colStop, this.orientation);
    }
    // like resize but only ever makes region smaller (guaranteed to stay within original bounds)
    // this is probably what's called for usually, may replace `resize()`
    crop(rowStart, rowStop, colStart, colStop) {
        return new Region(this.sheet, Math.max(rowStart ?? 0, this.rowStart), Math.min(rowStop ?? this.rowStop, this.rowStop), Math.max(colStart ?? 0, this.colStart), Math.min(colStop ?? this.colStop, this.colStop), this.orientation);
    }
    read(row, col) {
        if (row < this.rowStart || row >= this.rowStop || col < this.colStart || col >= this.colStop)
            return undefined;
        if (this.orientation === 'normal') {
            return this.sheet.getRange(row, col).getValue();
        }
        else {
            return this.sheet.getRange(col, row).getValue();
        }
    }
    write(row, col, value) {
        if (this.orientation === 'normal') {
            return this.sheet.getRange(row, col).setValue(value);
        }
        else {
            return this.sheet.getRange(col, row).setValue(value);
        }
    }
    readRow(row) {
        if (row < this.rowStart || row >= this.rowStop)
            return undefined;
        if (this.orientation === 'normal') {
            return this.sheet.getRange(row, this.colStart, 1, this.colStop - this.colStart)
                .getValues()[0];
        }
        else {
            return this.sheet.getRange(this.colStart, row, this.colStop - this.colStart, 1)
                .getValues()
                .map(r => r[0]);
        }
    }
    writeRow(row, data, onEnd) {
        let r;
        if (row >= this.rowStop) {
            if (onEnd === 'skip')
                return this;
            if (onEnd === 'insert') {
                if (this.orientation === 'normal') {
                    this.sheet.insertRows(this.rowStop, row - this.rowStop + 1);
                }
                else {
                    this.sheet.insertColumns(this.rowStop, row - this.rowStop + 1);
                }
            }
            r = this.resize(undefined, row + 1);
        }
        if (this.orientation === 'normal') {
            this.sheet.getRange(row, this.colStart, 1, this.colStop - this.colStart)
                .setValues([data]);
        }
        else {
            const arr = [];
            for (let i = 0; i < this.colStop - this.colStart; i++) {
                arr[i] = [data[i]];
            }
            this.sheet.getRange(this.colStart, row, this.colStop - this.colStart, 1)
                .setValues(arr);
        }
        return r ?? this;
    }
    readAll() {
        if (this.orientation === 'normal') {
            return this.sheet.getRange(this.rowStart, this.colStart, this.rowStop - this.rowStart, this.colStop - this.colStart)
                .getValues();
        }
        else {
            return transpose(this.sheet.getRange(this.colStart, this.rowStart, this.colStop - this.colStart, this.rowStop - this.rowStart)
                .getValues());
        }
    }
    writeAll(data) {
        if (this.orientation === 'normal') {
            this.sheet.getRange(this.rowStart, this.colStart, this.rowStop - this.rowStart, this.colStop - this.colStart)
                .setValues(data);
        }
        else {
            this.sheet.getRange(this.colStart, this.rowStart, this.colStop - this.colStart, this.rowStop - this.rowStart)
                .setValues(transpose(data));
        }
    }
}
function transpose(data) {
    const transposed = [];
    for (let i = 0; i < data[0].length; i++) {
        transposed.push(data.map(col => col[i]));
    }
    return transposed;
}
export class TableWalker {
    region;
    row;
    col;
    constructor(region, row, col) {
        this.region = region;
        this.row = row ?? region.rowStart;
        this.col = col ?? region.colStart;
    }
    static fromSheet(sheet, orientation = 'normal') {
        return new TableWalker(Region.fromSheet(sheet, orientation));
    }
    move(row, col) {
        const c = this.col + col;
        const r = this.row + row;
        if (this.region.colStart <= c && c < this.region.colStop
            && this.region.rowStart <= r && r < this.region.rowStop) {
            return new TableWalker(this.region, r, c);
        }
        return undefined;
    }
    crop(rowStart, rowStop, colStart, colStop) {
        rowStart ??= this.region.rowStart;
        rowStop ??= this.region.rowStop;
        colStart ??= this.region.colStart;
        colStop ??= this.region.colStop;
        if (rowStart <= this.row && this.row < rowStop
            && colStart <= this.col && this.col < colStop) {
            return new TableWalker(new Region(this.region.sheet, rowStart, rowStop, 1, colStop, this.region.orientation), this.row, this.col);
        }
        return undefined;
    }
    find(rowDelta, colDelta, predicate) {
        let cur = this;
        while (cur) {
            if (predicate(cur.value))
                return cur;
            cur = cur.move(rowDelta, colDelta);
        }
        return undefined;
    }
    findAll(rowDelta, colDelta, predicate) {
        const arr = [];
        let cur = this;
        while (cur) {
            if (predicate(cur.value))
                arr.push(cur);
            cur = cur.move(rowDelta, colDelta);
        }
        return arr;
    }
    map(rowDelta, colDelta, callback) {
        const arr = [];
        let cur = this;
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
