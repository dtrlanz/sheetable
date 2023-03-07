// Code used both server-side and client-side

class Table<T extends MetaTagged> {
    private ctor: { new (): T };
    private cache: T[] = [];
    readonly indexKey: string | undefined;
    readonly index: Map<string, number> = new Map();
    readonly sheet?: Sheet;
    headers: HeaderNode;
    dataRowStart: number;
    dataRowStop: number;
    readRow?(row: number): any[] | undefined;
    writeRow?(row: number, vals: any[]): void;
    fetchData?(rowStart: number, rowStop: number): Promise<void>;

    constructor(ctor: { new (): T }, sheet: Sheet, headers: HeaderNode);
    constructor(ctor: { new (): T }, sheet: SheetData);
    constructor(ctor: { new (): T }, sheet: Sheet | SheetData, headers?: HeaderNode | string[]) {
        this.ctor = ctor;
        this.indexKey = ctor.prototype.index;
        
        if ('getRange' in sheet) {
            this.sheet = sheet;
            this.headers = headers as HeaderNode;
            this.dataRowStart = getMaxRow(this.headers) + 1;
            const data = Region.fromSheet(sheet).resize(this.dataRowStart);
            this.dataRowStop = data.rowStop;
            this.readRow = function(row: number): any[] | undefined {
                return data.readRow(row);
            }
            const captureThis = this;
            this.writeRow = function(row: number, vals: any[]): void {
                const { rowStop } = data.writeRow(row, vals, 'encroach');
                captureThis.dataRowStop = rowStop;
            }
        } else {
            const ui = SpreadsheetApp.getUi();
            this.dataRowStart = getMaxRow({ row: 1, children: sheet.headers }) + 1;
            const headerTree = getHeaderTree(new ctor(), sheet.headers, this.dataRowStart);
            if (headerTree === undefined) throw new Error('failed to parse headers');
            this.headers = headerTree;
            let maxColLen = 0;
            ui.alert(JSON.stringify(sheet.columns));
            for (const col of sheet.columns) {
                if (col && col.length > maxColLen) maxColLen = col.length;
            }
            this.dataRowStop = maxColLen + 1;
            this.readRow = function(row: number): any[] | undefined {
                return sheet.columns.map(col => col[row - 1]);
            };
            const includeColumns: number[] = [];
            for (const c of this.headers.children) {
                for (let i = c.colStart; i < c.colStop; i++) includeColumns.push(i);
            }
            this.fetchData = function(rowStart: number, rowStop?: number): Promise<void> {
                let successHandler: (data: SheetColumns) => void = function () {};
                let failureHandle: (e: any) => void;
                const captureThis = this;
                const promise = new Promise<void>((res, rej) => {
                    successHandler = function(data: SheetColumns) {
                        captureThis.readRow = function(row: number): any[] | undefined {
                            return data.columns.map(col => col[row - 1]);
                        };
                        rowStop ??= captureThis.dataRowStop;
                        for (let i = rowStart - captureThis.dataRowStart; i < rowStop - captureThis.dataRowStart; i++) {
                            delete captureThis.cache[i];
                        }
                        res();
                    };
                    failureHandle = function(e) { 
                        rej(e);
                    };
                });
                const data = getSheetColumns({
                        url: sheet.url,
                        sheetName: sheet.sheetName,
                    }, includeColumns, rowStart, rowStop);
                successHandler(data);
                return promise;
            }
            // for (let i = 0; i < this.dataRowStop - this.dataRowStart; i++) {
            //     const vals = sheet.columns.map(col => col[i + this.dataRowStart - 1]);
            //     const obj = new ctor();
            //     applyRowValues(obj, vals, headerTree);
            //     this.cache[i] = obj;
            // }
        }
        this.initIndex();
    }

    private initIndex() {
        if (!this.indexKey) return;
        this.index.clear();
        for (let row = this.dataRowStart; row < this.dataRowStop; row++) {
            const entry = this.row(row);
            if (entry?.[this.indexKey])
                this.index.set(String(entry[this.indexKey]), row);
        }
    }

    row(row: number, refresh?: boolean): T | undefined {
        const cached = this.cache[row - this.dataRowStart];
        if (cached && !refresh) return cached;

        const vals = this.readRow?.(row);
        if (!vals) return undefined;

        const obj = new this.ctor();
        applyRowValues(obj, vals, this.headers);
        this.cache[row - this.dataRowStart] = obj;
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
            row = idxRow ?? this.dataRowStop;
        }
        entry ??= typeof idx === 'object' ? idx : {};
        const vals: any[] = [];
        fillRowValues(entry, vals, this.headers);
        this.writeRow?.(row, vals);
        if (strIdx && idxRow !== row)
            this.index.set(strIdx, row);
        applyRowValues(this.cache[row], vals, this.headers);
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

function getHeaderTree(obj: MetaTagged, branches: Branch[], rowStop: number): HeaderNode | undefined {
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
        const hn = getHeaderTree(item ?? {}, b.children, rowStop);
        if (hn) {
            node.children = hn.children.map(child => ({ ...child, parent: node }));
        }
        root.children.push(node);
    }
    return root;
}

interface WithRow {
    row: number;
    children: WithRow[];
}

function getMaxRow(headers: WithRow): number {
    return Math.max(headers.row, ...headers.children.map(c => getMaxRow(c)));
}

