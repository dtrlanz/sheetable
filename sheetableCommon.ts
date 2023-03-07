// Code used both server-side and client-side

abstract class Table<T extends MetaTagged> {
    private ctor: { new (): T };
    protected cache: T[] = [];
    readonly indexKey: string | undefined;
    readonly index: Map<string, number> = new Map();
    headers: HeaderNode;
    dataRowStart: number;
    dataRowStop: number;

    abstract readRow?(row: number): any[] | undefined;
    writeRow?(row: number, vals: any[]): void;

    constructor(ctor: { new (): T }, headers: HeaderNode, dataRowStop: number, dataRowStart?: number) {
        this.ctor = ctor;
        this.indexKey = ctor.prototype[META].index;
        this.headers = headers;
        this.dataRowStart = dataRowStart ?? getMaxRow(this.headers) + 1;
        this.dataRowStop = dataRowStop;
    }

    protected initIndex() {
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

