// Code used both server-side and client-side

namespace Sheetable {

    export type Orientation = 'normal' | 'transposed';

    export type Sendable = boolean | number | string | null | undefined | { [K: string]: Sendable };

    interface ObjectParameter { [key: string]: google.script.Parameter }

    export interface SheetInfo extends ObjectParameter {
        url?: string;
        id?: string;
        sheetName?: string;
        orientation?: Orientation;
    }

    export interface SheetData extends SheetColumns {
        url: string;
        sheetName: string;
        orientation: Orientation;
        headers: Branch[];
    }

    export interface SheetColumns {
        columns: Sendable[][];
        rowOffset: number;
    }

    export const META: unique symbol = Symbol('sheetable metadata');

    export abstract class Table<T extends MetaTagged> {
        private ctor: { new (): T };
        protected cache: T[] = [];
        readonly index: Map<string, number> = new Map();
        headers: HeaderNode;
        dataRowStart: number;
        dataRowStop: number;

        abstract readRow(row: number, checkState?: CellCheck): any[] | undefined;
        abstract writeRow(row: number, vals: any[], checkState?: CellCheck): void;

        constructor(ctor: { new (): T }, headers: HeaderNode, dataRowStop: number, dataRowStart?: number) {
            this.ctor = ctor;
            this.headers = headers;
            this.dataRowStart = dataRowStart ?? getMaxRow(this.headers) + 1;
            this.dataRowStop = dataRowStop;
        }

        get indexKey(): string {
            return this.ctor.prototype[Sheetable.META].index;
        }

        protected initIndex() {
            console.log('initIndex()');
            console.log([this.dataRowStart, this.dataRowStop]);
            if (!this.indexKey) return;
            this.index.clear();
            for (let row = this.dataRowStart; row < this.dataRowStop; row++) {
                const entry = this.getRow(row);
                console.log(row);
                console.log(JSON.stringify(entry));
                if (entry?.[this.indexKey])
                    this.index.set(String(entry[this.indexKey]), row);
            }
        }

        getRow(row: number, refresh?: boolean): T | undefined {
            const cached = this.cache[row - this.dataRowStart];
            if (cached && !refresh) return cached;

            const vals = this.readRow(row);
            if (!vals) return undefined;

            const obj = new this.ctor();
            applyRowValues(obj, vals, this.headers);
            this.cache[row - this.dataRowStart] = obj;
            return obj;
        }

        setRow(row: number, entry: Partial<T>): void {
            // get or create row
            const obj = this.getRow(row) ?? (this.cache[row - this.dataRowStart] = new this.ctor());
            // update row
            assignDeep(entry, obj);
            // write row to sheet
            const vals: any[] = [];
            fillRowValues(obj, vals, this.headers);
            return this.writeRow(row, vals);
        }

        get(idx: string | Partial<T>, refresh?: boolean): T | undefined {
            const strIdx = typeof idx === 'string' ? idx : this.getIndex(idx);
            if (strIdx === undefined) return undefined;
            const row = this.index.get(strIdx);
            if (row === undefined) return undefined;
            return this.getRow(row, refresh);
        }

        set(idx: string | Partial<T>, entry: Partial<T>): void;
        set(entry: Partial<T>): void;
        set(idx: string | Partial<T>, entry?: Partial<T>) {
            const strIdx = typeof idx === 'string' ? idx : this.getIndex(idx);
            if (strIdx === undefined) {
                throw new Error(`Index property '${this.indexKey}' not found in ${JSON.stringify(idx)}.`);
            }
            entry ??= typeof idx === 'object' ? idx : {};
            const row = this.index.get(strIdx) ?? this.dataRowStop;
            this.index.set(strIdx, row);
            return this.setRow(row, entry);
        }

        private getIndex(entry: Partial<T>): string | undefined {
            if (!this.indexKey) return undefined;
            const field = (entry as any)[this.indexKey];
            if (field !== undefined) return String(field);
            return undefined;
        }
    }

    export interface CellCheck {
        headerCells: number[],
        headerValues: string[],
        indexCells: number[],
        indexCellValues: string[],
    }

    export function applyRowValues(target: MetaTagged, row: any[], headers: HeaderNode | HeaderChild) {
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

    export function applyValue(target: any, propertyKey: string | number, val: any) {
        if (val === undefined) return;
        if (typeof target[propertyKey] === 'number' && typeof val === 'number') {
            target[propertyKey] = val;
        } else if (typeof target[propertyKey] === 'string') {
            target[propertyKey] = String(val);
        }
    }

    export function fillRowValues(source: MetaTagged, row: any[], headers: HeaderNode | HeaderChild) {
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

    export function assignDeep(source: any, target: any) {
        for (const k in source) {
            if (typeof source[k] === 'object' && !(source[k] instanceof Date)) {
                if (!target[k] || typeof target[k] !== 'object')
                    target[k] = {};
                assignDeep(source[k], target[k]);
                continue;
            }
            target[k] = source[k];
        }
    }

    export function getHeaderTree(obj: MetaTagged, branches: Branch[], rowStop: number): HeaderNode | undefined {
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
                    const init = obj[Sheetable.META]?.props.get(key)?.init;
                    if (init) {
                        obj[key] = init();
                    }
                }
                item = obj[key];
            } else {
                const [k, i] = key;
                obj[k] ??= [];
                if (obj[k][i] === undefined) {
                    const init = obj[Sheetable.META]?.props.get(k)?.init;
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

    export function getMaxRow(headers: WithRow): number {
        return Math.max(headers.row, ...headers.children.map(c => getMaxRow(c)));
    }

    export function label(value: string | string[]) {
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

    export function index(target: MetaTagged, propertyKey: string) {
        console.log('index: ' + propertyKey);
        console.log(typeof target);
        console.log(JSON.stringify(target));
        if (target[Sheetable.META]) {
            target[Sheetable.META].index = propertyKey;
            console.log(JSON.stringify(target[Sheetable.META]));
            return;
        }
        target[Sheetable.META] = {
            props: new Map(),
            labelToKey: new Map(),
            index: propertyKey,
        };
        console.log(JSON.stringify(target[Sheetable.META]));
    }

    function configureProp(target: MetaTagged, propertyKey: string, options: { label?: string | string[], init?: () => any }) {
        if (target[Sheetable.META] === undefined) {
            target[Sheetable.META] = {
                props: new Map(),
                labelToKey: new Map(),
            };
        }
        let prop = target[Sheetable.META].props.get(propertyKey);
        if (!prop) {
            target[Sheetable.META].props.set(propertyKey, options);
        } else {
            for (const k in options) {
                (prop as any)[k] = (options as any)[k];
            }
        }
        return target[Sheetable.META];
    }

    function labelToKey(obj: MetaTagged, label: any): string | [string, number] {
        return obj[Sheetable.META]?.labelToKey.get(String(label)) ?? String(label);
    }

}