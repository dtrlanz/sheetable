type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function sheetable<T extends MetaTagged>(Constructor: { new (): T }) {
    return class TypedTable extends Table<T> {
        constructor(spreadSheet: Spreadsheet, data?: T[]);
        constructor(sheet: Sheet);
        constructor(doc: Spreadsheet | Sheet, data?: T[]) {
            let sheet: Sheet;
            let headers: HeaderNode;
            if ('insertSheet' in doc) {
                sheet = doc.insertSheet();
                const specimen = data?.[0] ?? new Constructor();
                headers = createHeaders(specimen, 1, 1);
                writeHeaders(headers, sheet);
            } else {
                sheet = doc;
                const r = readHeaders(TableWalker.fromSheet(sheet), new Constructor());
                if (!r) throw new Error('Error reading table headers.');
                headers = r;
            }
            super(Constructor, sheet, headers);
        }
    };
}

class Table<T extends MetaTagged> {
    readonly sheet: Sheet;
    readonly orientation: Orientation;
    private ctor: { new (): T };
    private headers: HeaderNode;
    private cache: T[] = [];
    readonly indexKey: string | undefined;
    private index: Map<string, number> = new Map();
    data: Region;

    constructor(ctor: { new (): T }, sheet: Sheet, headers: HeaderNode) {
        this.ctor = ctor;
        this.sheet = sheet;
        this.orientation = getOrientation(sheet);
        this.headers = headers;
        const firstDataRow = getMaxRow(headers) + 1;
        this.data = Region.fromSheet(sheet).resize(firstDataRow);
        const specimen = this.row(this.data.rowStart);
        this.indexKey = specimen?.[META]?.index;
        this.initIndex();
    }

    private initIndex() {
        if (!this.indexKey) return;
        this.index.clear();
        for (let row = this.data.rowStart; row < this.data.rowStop; row++) {
            const entry = this.row(row);
            if (entry?.[this.indexKey])
                this.index.set(String(entry[this.indexKey]), row);
        }
    }

    row(row: number, refresh?: boolean): T | undefined {
        const cached = this.cache[row - this.data.rowStart];
        if (cached && !refresh) return cached;

        const vals = this.data.readRow(row);
        if (!vals) return undefined;

        const obj = new this.ctor();
        applyRowValues(obj, vals, this.headers);
        this.cache[row - this.data.rowStart] = obj;
        return obj;
    }

    get(idx: string | Partial<T>, refresh?: boolean): T | undefined {
        const strIdx = typeof idx === 'string' ? idx : this.getIndex(idx);
        if (strIdx === undefined) return undefined;
        const row = this.index.get(strIdx);
        if (row === undefined) return undefined;
        return this.row(row, refresh);
    }

    set(idx: string | Partial<T>, entry: Partial<T>): void;
    set(row: number, entry: Partial<T>): void;
    set(entry: Partial<T>): void;
    set(idx: string | Partial<T> | number, entry?: Partial<T>) {
        let strIdx: string | undefined; 
        let row: number;
        let idxRow: number | undefined;
        if (typeof idx === 'number') {
            strIdx = undefined;
            row = idx;
        } else {
            strIdx = typeof idx === 'string' ? strIdx = idx 
                                             : this.getIndex(idx);
            idxRow = strIdx !== undefined ? this.index.get(strIdx) : undefined;
            row = idxRow ?? this.data.rowStop;
        }
        entry ??= typeof idx === 'object' ? idx : {};
        const vals: any[] = [];
        fillRowValues(entry, vals, this.headers);
        this.data = this.data.writeRow(row, vals, 'encroach');
        if (strIdx && idxRow !== row)
            this.index.set(strIdx, row);
        delete this.cache[row];
    }

    private getIndex(entry: Partial<T>): string | undefined {
        if (!this.indexKey) return undefined;
        const field = (entry as any)[this.indexKey];
        if (field !== undefined) return String(field);
        return undefined;
    }
}

function applyRowValues(target: MetaTagged, row: any[], headers: HeaderNode | HeaderChild) {
    if (headers.children.length === 0 && 'key' in headers) {
        const val = row[headers.colStart - 1];
        if (typeof headers.key === 'string') {
            if (headers.key in target) {
                applyValue(target, headers.key, val);
            }
        } else {
            if (Array.isArray(target[headers.key[0]])) {
                applyValue(target[headers.key[0]], headers.key[1], val);
            }
        }
    } else {
        let obj = target;
        if ('key' in headers) {
            if (typeof headers.key === 'string') {
                obj = target[headers.key];
            } else {
                obj = target[headers.key[0]][headers.key[1]];
            }
        }
        for (const c of headers.children) {
            applyRowValues(obj, row, c);
        }
    }
}

function fillRowValues(source: MetaTagged, row: any[], headers: HeaderNode | HeaderChild) {
    if (headers.children.length === 0 && 'key' in headers) {
        let val: any;
        if (typeof headers.key === 'string') {
            val = source[headers.key];
        } else {
            val = source[headers.key[0]][headers.key[1]];
        }
        if (val !== undefined)
            row[headers.colStart - 1] = val;
    } else {
        let obj = source;
        if ('key' in headers) {
            if (typeof headers.key === 'string') {
                obj = source[headers.key];
            } else {
                obj = source[headers.key[0]][headers.key[1]];
            }
        }
        for (const c of headers.children) {
            fillRowValues(obj, row, c);
        }
    }
}

function applyValue(target: any, propertyKey: string | number, val: any) {
    if (typeof target[propertyKey] === 'number' && typeof val === 'number') {
        target[propertyKey] = val;
    } else if (typeof target[propertyKey] === 'string') {
        target[propertyKey] = String(val);
    }
}

function getMaxRow(headers: HeaderNode): number {
    return Math.max(headers.row, ...headers.children.map(c => getMaxRow(c)));
}

function label(value: string | string[]) {
    return function (target: MetaTagged, propertyKey: string) {
        const l2k = configureProp(target, propertyKey, { label: value }).labelToKey;
        if (typeof value === 'string') {
            l2k.set(value, propertyKey);
        } else {
            for (let i = 0; i < value.length; i++) {
                l2k.set(value[i], [propertyKey, i])
            }
        }
    }
}

function index(target: MetaTagged, propertyKey: string) {
    if (target[META]) {
        target[META].index = propertyKey;
        return;
    }
    target[META] = {
        props: new Map(),
        labelToKey: new Map(),
        index: propertyKey,
    };
}

function configureProp(target: MetaTagged, propertyKey: string, options: { label?: string | string[], init?: () => any }) {
    if (target[META] === undefined) {
        target[META] = {
            props: new Map(),
            labelToKey: new Map(),
        };
    }
    let prop = target[META].props.get(propertyKey);
    if (!prop) {
        target[META].props.set(propertyKey, options);
    } else {
        for (const k in options) {
            (prop as any)[k] = (options as any)[k];
        }
    }
    return target[META];
}

function labelToKey(obj: MetaTagged, label: any): string | [string, number] {
    return obj[META]?.labelToKey.get(String(label)) ?? String(label);
}

const META: unique symbol = Symbol('sheetable metadata');

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
    const startPoints = walker.filter(0, 1, v => v);
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

function readHeaders(walker: TableWalker, obj: MetaTagged): HeaderNode | undefined {
    let headerBranches: Branch[] = [];
    let rowStop = walker.region.rowStop;
    if (!walker.value) {
        // unlabeled first column is ok (other columns are recognized by their headers)
        let next = walker.find(0, 1, v => v);
        headerBranches.push({
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
        const { branches, minRowStop, maxRowStop } = br;
        headerBranches = [...headerBranches, ...branches];
        // maxRowStop overrides minRowStop; if exact depth is uncertain, assume minimum
        rowStop = Math.min(minRowStop, maxRowStop);
    }
    return getHeaders(obj, headerBranches, rowStop);
}


function getHeaders(obj: MetaTagged, branches: Branch[], rowStop: number): HeaderNode | undefined {
    // ui.alert(`branch labels: ${branches.map(b=>b.label).join(', ')}`);
    if (branches.length === 0 || branches[0].row >= rowStop) return undefined;
    const root: HeaderNode = {
        colStart: branches[0].start,
        colStop: branches[branches.length - 1].stop,
        row: branches[0].row,
        children: [],
    };
    for (const b of branches) {
        let key: string | [string, number];
        key = labelToKey(obj, b.label);

        let item;
        if (typeof key === 'string') {
            if (obj[key] === undefined) {
                const init = obj[META]?.props.get(key)?.init;
                if (init) {
                    obj[key] = init();
                }
            }
            item = obj[key];
        } else {
            const [k, i] = key;
            obj[k] ??= [];
            if (obj[k][i] === undefined) {
                const init = obj[META]?.props.get(k)?.init;
                if (init) {
                    obj[k][i] = init();
                }
            }
            item = obj[k][i];
        }

        const node = {
            row: b.row,
            colStart: b.start,
            colStop: b.stop,
            children: [] as HeaderChild[],
            parent: root,
            key: key,
            label: b.label,
        };
        const hn = getHeaders(item ?? {}, b.children, rowStop);
        if (hn) {
            node.children = hn.children.map(child => ({ ...child, parent: node }));
        }
        root.children.push(node);
    }
    return root;
}


class Region {
    readonly sheet: Sheet;
    readonly orientation: Orientation;
    readonly colStart: number;
    readonly colStop: number;
    readonly rowStart: number;
    readonly rowStop: number;

    constructor(sheet: Sheet, rowStart: number, rowStop: number, colStart: number, colStop: number, orientation?: Orientation) {
        this.sheet = sheet;
        this.orientation = orientation ?? getOrientation(sheet);
        this.colStart = colStart;
        this.colStop = colStop;
        this.rowStart = rowStart;
        this.rowStop = rowStop;
    }

    static fromSheet(sheet: Sheet): Region {
        const orient = getOrientation(sheet);
        let rowStop = sheet.getLastRow() + 1;
        let colStop = sheet.getLastColumn() + 1;
        if (orient === 'transposed') [colStop, rowStop] = [rowStop, colStop];
        return new Region(sheet, 1, rowStop, 1, colStop, orient);
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
            return new TableWalker(new Region(this.region.sheet, rowStart, rowStop, 1, colStop), this.row, this.col);
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

    filter(rowDelta: number, colDelta: number, predicate: (v: any) => boolean): TableWalker[] {
        const arr: TableWalker[] = [];
        let cur: TableWalker | undefined = this;
        while (cur) {
            if (predicate(cur.value)) arr.push(cur);
            cur = cur.move(rowDelta, colDelta);
        }
        return arr;
    }

    get value() {
        return this.region.read(this.row, this.col);
    }
}

type Orientation = 'normal' | 'transposed';

function getOrientation(sheet: Sheet): Orientation {
    const v = sheet.getRange(1, 1).getValue();
    if (typeof v === 'string' && v.substring(0, 2) === '>>') 
        return 'transposed';
    return 'normal';
}