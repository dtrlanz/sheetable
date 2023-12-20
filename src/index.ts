import { Header } from "./headers.js";
import { Constructor, MetaProperty } from "./meta-props.js";
import { getIndexTitles } from "./title.js";
import { flattenEntries } from "./type.js";
import { Sendable } from "./values.js";

const indexProp = new MetaProperty('index');
export const index = indexProp.getDecorator(true);

export class Index<T extends object> {
    ctor: Constructor<T>;
    context?: { readonly [k: string]: any };
    header: Header<T>;
    indexKeys: (string | symbol)[];
    indexTitles: string[];

    constructor(
        ctor: Constructor<T>, 
        header: Header<T>, 
        context?: { readonly [k: string]: any }
    ) {
        this.ctor = ctor;
        this.context = context;
        this.header = header;
        // TODO: avoid calling getIndexKeys() twice
        this.indexKeys = getIndexKeys(ctor, context);
        this.indexTitles = getIndexTitles(ctor, context);
    }

    setRows(rows: Sendable[][], colNumbers: number[], rowOffset: number) {
        // Identify the columns needed for the index and associate them with the corresponding
        // key tuples
        const entryStructure: [key: (string | symbol | number)[], colIdx: number][] = [];
        for (const title of this.indexTitles) {
            const columns = this.header.getColumnsForTitle([title]);
            for (const col of columns) {
                const keyTuple = this.header.getKeyForColumns(col);
                if (!keyTuple) continue;
                const colIdx = colNumbers.findIndex(n => n === col);
                entryStructure.push([keyTuple, colIdx]);
            }
        }
        // Process each row of data
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
            // Collect needed column values into array of entries
            const entries: [(string | symbol | number)[], any][] = [];
            for (const [keyTuple, colIdx] of entryStructure) {
                entries.push([keyTuple, rows[rowIdx][colIdx]]);
            }
            // We're not creating a complete object here because the column selection provided
            // might not include all required properties. To construct just some of the properties
            // we're calling `flattenEntries` instead of `createRecursively`.
            const map = new Map(flattenEntries(this.ctor, entries, this.context));
            
            // Collect values of indexed properties into array
            const index = this.indexKeys.map(k => map.get(k));

            // Set index for current row.
            this.set(index, rowIdx + rowOffset);
        }

    }

    set(key: any[], row: number) {
        throw new Error('Index.set() not yet implemented');
    }
}

export function getIndexKeys(ctor: Constructor, context?: { readonly [k: string]: any }): (string | symbol)[] {
    return indexProp.getReader(context).list(ctor);
}

type TupleMapNode<T> = { value?: T, next: Map<any, TupleMapNode<T>> };

/**
 * TupleMap - map that uses variable-length tuples as keys
 * 
 * This class will probably become obsolete if/when the Records & Tuples Proposal reaches stage 4
 * (see https://github.com/tc39/proposal-record-tuple)
 */
export class TupleMap<T = any> {
    map = new Map<any, TupleMapNode<T>>();

    set(key: any[], value: T) {
        let map = this.map;
        for (let i = 0; i < key.length - 1; i++) {
            const item = key[i];
            if (!map.has(item)) {
                map.set(item, { next: new Map() });
            }
            map = map.get(item)!.next;
        }
        const last = key.at(-1);
        if (!map.has(last)) {
            map.set(last, { value: value, next: new Map() });
        } else {
            map.get(last)!.value = value;
        }
    }

    get(key: any[]): T | undefined {
        let map = this.map;
        for (let i = 0; i < key.length - 1; i++) {
            const item = key[i];
            if (!map.has(item)) {
                return undefined
            }
            map = map.get(item)!.next;
        }
        return map.get(key.at(-1))?.value;
    }
}