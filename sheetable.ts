type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function sheetable<T extends MetaTagged>(Constructor: { new (): T }) {
    return class ServerTable extends Table<T> {
        readonly sheet: Sheet;
        private data: Region;
        
        private constructor(sheet: Sheet, headers: HeaderNode) {
            const region = Region.fromSheet(sheet);
            super(Constructor, headers, region.rowStop);
            this.sheet = sheet;
            this.data = region;
            this.initIndex();
        }

        static open(sheet: Sheet): ServerTable {
            const headers = getHeaders(TableWalker.fromSheet(sheet), new Constructor());
            if (!headers) throw new Error('Error reading table headers.');
            return new ServerTable(sheet, headers);
        }

        static create(spreadsheet: Spreadsheet, data: T[] = []): ServerTable {
            const sheet = spreadsheet.insertSheet();
            const specimen = data?.[0] ?? new Constructor();
            const headers = createHeaders(specimen, 1, 1);
            writeHeaders(headers, sheet);
            return new ServerTable(sheet, headers);
        }

        readRow(row: number, checkState: CellCheck): any[] | undefined {
            return this.data.readRow(row);
        }

        writeRow(row: number, vals: any[], checkState: CellCheck): void {
            const { rowStop } = this.data.writeRow(row, vals, 'encroach');
            this.dataRowStop = rowStop;
        }
    };
}


interface MetaTagged {
    [META]?: {
        props: Map<string, {
            label?: string | string[],
            init?: () => any,
        }>,
        labelToKey: Map<string, string | [string, number]>,
        index?: string,
    };
    [k: string]: any;
}

interface HeaderLabels {
    [K: string]: string | string[];
}

interface HeaderNode {
    readonly colStart: number;
    readonly colStop: number;
    readonly row: number;
    readonly children: HeaderChild[];
    ignore?: boolean;
}

interface HeaderChild extends HeaderNode {
    readonly parent: HeaderNode;
    readonly key: string | [string, number];
    readonly label: string;
}

function writeHeaders(headers: HeaderNode, sheet: Sheet) {
    if ('label' in headers) {
        sheet.getRange(headers.row, headers.colStart).setValue(headers.label);
    }
    for (const c of headers.children) writeHeaders(c, sheet);
}

function createHeaders(
    obj: MetaTagged,
    colStart: number,
    row: number,
): HeaderNode {
    const children: (Omit<HeaderChild, 'parent'>)[] = [];
    let col = colStart;
    for (const k in obj) {
        const v = obj[k];
        if (Array.isArray(v)) {
            for (let i = 0; i < v.length; i++) {
                const label = obj[META]?.props.get(k)?.label?.[i] ?? `${k}[${i}]`;
                if (label === null) continue;
                const subHeaders = {
                    ...createHeaders(v[i], col, row + 1),
                    row: row,
                    key: [k, i] as [string, number],
                    label: label,
                };
                children.push(subHeaders);
                col = subHeaders.colStop;
            }
        } else {
            const label = obj[META]?.props.get(k)?.label ?? k;
            if (label === null) continue;
            if (Array.isArray(label)) throw Error('array not expected');
            if (typeof v === 'object') {
                const subHeaders = {
                    ...createHeaders(v, col, row + 1),
                    row: row,
                    key: k,
                    label: label,
                };
                children.push(subHeaders);
                col = subHeaders.colStop;
            } else {
                children.push({
                    colStart: col,
                    colStop: col + 1,
                    row: row,
                    children: [],
                    key: k,
                    label: label,
                });
                col++;
            }
        }
    }
    const root = {
        colStart: colStart,
        colStop: col,
        row: row,
        children: [] as HeaderChild[],
    };
    root.children = children.map(child => ({
        ...child,
        parent: root,
    }));
    return root;
}

interface Branch {
    label: any;
    row: number;
    start: number;
    stop: number;
    children: Branch[];
}

type BranchResult = { branches: Branch[], minRowStop: number, maxRowStop: number };

function findBranches(walker: TableWalker): BranchResult | null {
    //const ui = SpreadsheetApp.getUi();
    if (!walker.value) return null;
    const startPoints = walker.findAll(0, 1, v => v);
    //ui.alert(JSON.stringify(startPoints.map(p => p.value)));
    const topLevel = walker.row === walker.region.rowStart;
    let minRowStop = walker.region.rowStart + 1; //#???
    let maxRowStop = walker.region.rowStop;
    const arr = [];
    for (let i = 0; i < startPoints.length; i++) {
        const stop = startPoints[i + 1]?.col ?? walker.region.colStop;
        const region = startPoints[i].move(1, 0)?.crop(undefined, maxRowStop, undefined, stop);
        //ui.alert(`walker.value: ${walker.value}\nstartpoints[i].value: ${startPoints[i].value}\nstop: ${stop}\nmaxRowStop: ${maxRowStop}\nregion: ${region}`);
        let children: Branch[] = [];
        if (region) {
            const nextLevel = findBranches(region);
            if (nextLevel) {
                if (minRowStop < nextLevel.minRowStop)
                    minRowStop = nextLevel.minRowStop;
                if (maxRowStop > nextLevel.maxRowStop)
                    maxRowStop = nextLevel.maxRowStop;
                children = nextLevel.branches;
            } else {
                const dataStart = region.find(1, 0, v => v);
                if (dataStart && dataStart.row < maxRowStop) {
                    maxRowStop = dataStart.row;
                }
            }
        }
        const actualStop = children[children.length - 1]?.stop ?? startPoints[i].col + 1;
        arr.push({
            label: startPoints[i].value,
            row: startPoints[i].row,
            start: startPoints[i].col,
            stop: actualStop,
            children: children,
        })
        // Gaps between branches are only allowed at the top level
        if (!topLevel && stop !== undefined && actualStop < stop) break;
    }
    if (arr.length > 1 && minRowStop < walker.row + 1)
        minRowStop = walker.row + 1;
    return {
        branches: arr,
        minRowStop: minRowStop,
        maxRowStop: maxRowStop,
    };
}

function getHeaders(walker: TableWalker, obj: MetaTagged): HeaderNode | undefined {
    const { branches, rowStop } = getHeadersHelper(walker);
    return getHeaderTree(obj, branches, rowStop);
}

function getHeadersForClient(walker: TableWalker): Branch[] {
    const { branches, rowStop } = getHeadersHelper(walker);
    trimBranches(branches, rowStop);
    return branches;

    function trimBranches(branches: Branch[], rowStop: number) {
        // assume children at the same level will always be in the same row
        if (branches[0]?.row >= rowStop) {
            branches.length = 0;
            return;
        }
        for (const c of branches) {
            trimBranches(c.children, rowStop);
        }
    }
}

function getHeadersHelper(walker: TableWalker): { branches: Branch[], rowStop: number } {
    let branches: Branch[] = [];
    let rowStop = walker.region.rowStop;
    if (!walker.value) {
        // unlabeled first column is ok (other columns are recognized by their headers)
        let next = walker.find(0, 1, v => v);
        branches.push({
            label: '',
            row: walker.row,
            start: walker.col,
            stop: next?.col ?? walker.col + 1,
            children: [],
        });
        const dataStart = walker.find(1, 0, v => v);
        if (dataStart)
            next = next?.crop(undefined, dataStart.row);
        walker = next ?? walker;
    }
    const br = findBranches(walker);
    if (br) {
        const { branches: otherBranches, minRowStop, maxRowStop } = br;
        branches = [...branches, ...otherBranches];
        // maxRowStop overrides minRowStop; if exact depth is uncertain, assume minimum
        rowStop = Math.min(minRowStop, maxRowStop);
    }
    return { branches, rowStop };
}

class Region {
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

class TableWalker {
    readonly region: Region;
    readonly row: number;
    readonly col: number;

    constructor(region: Region, row?: number, col?: number) {
        this.region = region;
        this.row = row ?? 1;
        this.col = col ?? 1;
    }

    static fromSheet(sheet: Sheet): TableWalker {
        return new TableWalker(Region.fromSheet(sheet));
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

type Orientation = 'normal' | 'transposed';

type Sendable = boolean | number | string | null | undefined | { [K: string]: Sendable };

interface SheetInfo {
    url?: string;
    id?: string;
    sheetName?: string;
    orientation?: Orientation;
}

function getSheet(info: SheetInfo): { spreadsheet: Spreadsheet, sheet: Sheet, orientation: Orientation } {
    let spreadsheet: Spreadsheet;
    let sheet: Sheet;
    if (!info.url && !info.id) {
        spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        if (!info.sheetName) {
            sheet = spreadsheet.getActiveSheet();
        }
    } else {
        if (info.url) {
            spreadsheet = SpreadsheetApp.openByUrl(info.url)
        } else {
            spreadsheet = SpreadsheetApp.openById(info.id!);
        }
    }
    if (info.sheetName) {
        const s = spreadsheet.getSheetByName(info.sheetName);
        if (!s) throw new Error(`Sheet named '${info.sheetName} does not exist.`);
        sheet = s;
    } else {
        sheet = spreadsheet.getSheets()[0];
    }
    const orientation = info.orientation === 'transposed' ? 'transposed' : 'normal';
    return { spreadsheet, sheet, orientation };
}

interface SheetData extends SheetColumns {
    url: string;
    sheetName: string;
    orientation: Orientation;
    headers: Branch[];
}

interface SheetColumns {
    columns: Sendable[][];
    rowOffset: number;
}

function getSheetData(info: SheetInfo = {}, columnLabels: string[], rowStart: number, rowStop?: number): SheetData {
    const { spreadsheet, sheet, orientation } = getSheet(info);
    const region = Region.fromSheet(sheet, orientation).resize(undefined, rowStop);
    const branches = getHeadersForClient(new TableWalker(region));

    const columnData: Sendable[][] = [];
    for (const label of columnLabels) {
        for (const br of branches) {
            if (br.label === label) {
                for (let col = br.start; col < br.stop; col++) {
                    // note that column data will include header row(s)
                    const walker = new TableWalker(region, rowStart, col)
                    // use 0-indexed arrays for consistency
                    columnData[col - 1] = walker.map(1, 0, scalarToSendable);
                }
                break;
            }
        }
    }
    
    return {
        url: spreadsheet.getUrl(),
        sheetName: sheet.getName(),
        orientation: orientation,
        headers: branches,
        columns: columnData,
        rowOffset: rowStart,
    }
}

function getSheetColumns(info: SheetInfo = {}, columns: number[], rowStart: number, rowStop?: number): SheetColumns {
    const { sheet, orientation } = getSheet(info);
    const region = Region.fromSheet(sheet, orientation).resize(undefined, rowStop);

    const columnData: Sendable[][] = [];
    for (const col of columns) {
        const walker = new TableWalker(region, rowStart, col)
        // use 0-indexed arrays for consistency
        columnData[col - 1] = walker.map(1, 0, scalarToSendable);
    }
    
    return {
        columns: columnData,
        rowOffset: rowStart,
    }
}

function writeSheetRow(info: SheetInfo, row: number, vals: Sendable[], checkState?: CellCheck) {
    const { sheet, orientation } = getSheet(info);
    const region = Region.fromSheet(sheet, orientation);
    region.writeRow(row, vals, 'encroach');

}

function scalarToSendable(val: any): Sendable {
    if (typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean' ||
        typeof val === 'undefined') 
    {
        return val;
    } else if (Date.prototype.isPrototypeOf(val)) {
        return (val as Date).getTime();
    }
}

function include(filename: string) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}