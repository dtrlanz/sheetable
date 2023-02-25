type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function sheetable<T extends MetaTagged>(Constructor: { new (): T }) {
    return class Table implements Table {
        readonly sheet: Sheet;
        readonly orientation: Orientation;
        private headers: HeaderNode;
    
        constructor(spreadSheet: Spreadsheet, data?: T[]);
        constructor(sheet: Sheet);
        constructor(doc: Spreadsheet | Sheet, data?: T[]) {
            let sheet: Sheet;
            if ('insertSheet' in doc) {
                sheet = doc.insertSheet();
                const specimen = data?.[0] ?? new Constructor();
                this.headers = createHeaders(specimen, 1, 1);
                writeHeaders(this.headers, sheet);
            } else {
                sheet = doc;
                const headers = readHeaders(TableWalker.fromSheet(sheet), new Constructor());
                if (!headers)
                    throw new Error('Error reading table headers.');
                this.headers = headers;
            }
            this.sheet = sheet;
            this.orientation = getOrientation(sheet);
        }
    };
}

interface Table {
    readonly sheet: Sheet;
    readonly orientation: Orientation;
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

const META: unique symbol = Symbol('sheetable metadata');

interface MetaTagged {
    [META]?: {
        props: Map<string, {
            label?: string | string[],
            init?: () => any,
        }>,
        labelToKey: Map<string, string | [string, number]>,
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
    if (!walker.value) return null;
    const startPoints = walker.filter(0, 1, v => v);
    const topLevel = walker.row === walker.region.rowStart;
    let minRowStop = walker.region.rowStart + 1; //#???
    let maxRowStop = walker.region.rowStop;
    const arr = [];
    for (let i = 0; i < startPoints.length; i++) {
        const stop = startPoints[i + 1]?.col ?? walker.region.colStop;
        const region = startPoints[i].move(1, 0)?.crop(undefined, maxRowStop, undefined, stop);
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
        // if first column has no header, use it as index
        let next = walker.find(0, 1, v => v);
        headerBranches.push({
            label: undefined,
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
        // ui.alert(JSON.stringify(branches));
        // ui.alert(`${minRowStop}, ${maxRowStop}`);
        headerBranches = [...headerBranches, ...branches];
        // maxRowStop overrides minRowStop; if exact depth is uncertain, assume minimum
        rowStop = Math.min(minRowStop, maxRowStop);
    }
    return getHeaders(obj, headerBranches, rowStop, 'index');
}


function getHeaders(obj: MetaTagged, branches: Branch[], rowStop: number, ifEmpty: 'index' | 'ignore'): HeaderNode | undefined {
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
        if (b.label === undefined && ifEmpty === 'index') {
            key = 'index';
        } else {
            key = obj[META]?.labelToKey.get(String(b.label)) 
                ?? String(b.label);
        }

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
        const hn = getHeaders(item ?? {}, b.children, rowStop, 'ignore');
        if (hn) {
            node.children = hn.children.map(child => ({ ...child, parent: node }));
        }
        root.children.push(node);
    }
    return root;
}


interface Region {
    sheet: Sheet;
    orientation: Orientation;
    colStart: number;
    colStop: number;
    rowStart: number;
    rowStop: number;
}

class TableWalker {
    readonly region: Region;
    readonly row: number;
    readonly col: number;

    private constructor(region: Region, row?: number, col?: number) {
        this.region = region;
        this.row = row ?? 1;
        this.col = col ?? 1;
    }

    static fromSheet(sheet: Sheet): TableWalker {
        const orient = getOrientation(sheet);
        let rowStop = sheet.getLastRow() + 1;
        let colStop = sheet.getLastColumn() + 1;
        if (orient === 'transposed') [colStop, rowStop] = [rowStop, colStop];
        return new TableWalker({
            sheet: sheet,
            orientation: orient,
            rowStart: 1,
            rowStop: rowStop,
            colStart: 1,
            colStop: colStop,
        });
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
            return new TableWalker({
                sheet: this.region.sheet,
                orientation: this.region.orientation,
                rowStart: rowStart,
                rowStop: rowStop,
                colStart: 1,
                colStop: colStop,
            }, this.row, this.col);
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
        if (this.region.orientation === 'normal') {
            return this.region.sheet.getRange(this.row, this.col).getValue();
        } else {
            return this.region.sheet.getRange(this.col, this.row).getValue();
        }
    }
}

type Orientation = 'normal' | 'transposed';

function getOrientation(sheet: Sheet): Orientation {
    const v = sheet.getRange(1, 1).getValue();
    if (typeof v === 'string' && v.substring(0, 2) === '>>') 
        return 'transposed';
    return 'normal';
}