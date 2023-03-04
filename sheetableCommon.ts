// Code used both server-side and client-side

class Table<T extends MetaTagged> {
    readonly sheet: Sheet;
    readonly orientation: Orientation;
    private ctor: { new (): T };
    private cache: T[] = [];
    readonly indexKey: string | undefined;
    readonly index: Map<string, number> = new Map();
    headers: HeaderNode;
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

