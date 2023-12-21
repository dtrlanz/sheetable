import { Header } from "./headers.js";
import { Constructor, MetaProperty } from "./meta-props.js";
import { getIndexTitles } from "./title.js";
import { flattenEntries } from "./type.js";
import { Sendable } from "./values.js";

const indexProp = new MetaProperty('index');
export const index = indexProp.getDecorator(true);

/**
 * Index — dinstinguishes a set of records by their indexed properties and associates a given
 *  value with each record in a map-like structure.
 * 
 * T — the type of records that are to be indexed
 * V — the type of value to be associated with each record
 */
export class Index<T extends object, V> {
    ctor: Constructor<T>;
    context?: { readonly [k: string]: any };
    header: Header<T>;
    indexKeys: (string | symbol)[];
    indexTitles: string[];
    map = new TupleMap<V>();

    constructor(
        ctor: Constructor<T>, 
        header: Header<T>, 
        context?: { readonly [k: string]: any }
    ) {
        this.ctor = ctor;
        this.context = context;
        this.header = header;
        // TODO: avoid calling getIndexKeys() twice
        // (thrice, actually, if calling from `Table.open()`)
        this.indexKeys = getIndexKeys(ctor, context);
        this.indexTitles = getIndexTitles(ctor, context);
    }

    *getIndexedPropsFromObjects(objects: Iterable<T>): Iterable<[any[], T]> {
        for (const obj of objects) {
            yield [this.indexKeys.map(k => (obj as any)[k]), obj];
        }
    }

    /**
     * Converts each row of data to a tuple containing the values of indexed properties in that
     * record. This involves selecting the relevant columns, constructing objects from those 
     * column values where needed, and returning the result as a tuple.
     * @param rows — an iterable or rows; each row is an array whose elements correspond to table
     *  columns
     * @param colNumbers — a numeric array identifying the column numbers corresponding to the
     *  elements in each row of data
     * @returns — an iterable of tuples corresponding the input rows, each one containing the
     *  indexed properties of the given record
     */
    *getIndexedPropsFromRows(rows: Iterable<Sendable[]>, colNumbers: number[]): Iterable<any[]> {
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
        for (const r of rows) {
            // Collect needed column values into array of entries
            const entries: [(string | symbol | number)[], any][] = [];
            for (const [keyTuple, colIdx] of entryStructure) {
                entries.push([keyTuple, r[colIdx]]);
            }
            // We're not creating a complete object here because the column selection provided
            // might not include all required properties. To construct just some of the properties
            // we're calling `flattenEntries` instead of `createRecursively`.
            const entryMap = new Map(flattenEntries(this.ctor, entries, this.context));
            
            // Collect values of indexed properties into array
            yield this.indexKeys.map(k => entryMap.get(k));
        }
    }

    /**
     * Sets the index ids for multiple rows of data
     * @param indexedProps — an iterable of tuples corresponding, each containing the indexed
     *  properties of a record
     * @param initValue — callback that returns the value to be stored; will be called for 
     *  elements that do not already exist
     */
    initAll(indexedProps: Iterable<Sendable[]>, initValue: () => V) {
        for (const item of indexedProps) {
            this.init(item, initValue);
        }
    }

    /**
     * Adds an element for an indexed record if it does not already exist.
     * @param idxValues — tuple of index values for a given record
     * @param initValue — callback that returns the value to be stored; will only be called if an
     *  element does not already exist for the indexed record
     */
    init(idxValues: any[], initValue: () => V) {
        // Stringify objects in the key. This may not be the ideal way to compare by value, but 
        // it's easy, predictable, and relatively efficient.
        idxValues = idxValues.map(v => v && typeof v === 'object' ? JSON.stringify(v) : v);

        // Store row number
        this.map.init(idxValues, initValue);
    }

    /**
     * Adds an element for an indexed record if it does not already exist, otherwise updates the 
     * existing element.
     * @param idxValues — tuple of index values for a given record
     * @param value — the value to be associated with that record
     */
    set(idxValues: any[], value: V) {
        // Stringify objects in the key. This may not be the ideal way to compare by value, but 
        // it's easy, predictable, and relatively efficient.
        idxValues = idxValues.map(v => v && typeof v === 'object' ? JSON.stringify(v) : v);

        // Store row number
        this.map.set(idxValues, value);
    }

    /**
     * Gets the element associated with an indexed record.
     * @param indexedValues — values of indexed properties for a given record
     * @returns — element associated with that record, if any; otherwise `undefined`
     */
    get(indexedValues: any[]): V | undefined {
        indexedValues = indexedValues.map(v => v && typeof v === 'object' ? JSON.stringify(v) : v);
        return this.map.get(indexedValues);
    }
}

export function getIndexKeys(ctor: Constructor, context?: { readonly [k: string]: any }): (string | symbol)[] {
    return indexProp.getReader(context).list(ctor);
}

type TupleMapNode<T> = { value?: T, next: Map<any, TupleMapNode<T>> };

/**
 * TupleMap — map that uses variable-length tuples as keys
 * 
 * This class will probably become obsolete if/when the Records & Tuples Proposal reaches stage 4
 * (see https://github.com/tc39/proposal-record-tuple).
 */
export class TupleMap<T = any> {
    map = new Map<any, TupleMapNode<T>>();

    /**
     * Adds a new element with a specified key to the Map if an element with the same does not 
     * already exist.
     * @param key 
     * @param init — callback that returns the value to be stored; will only be called if an 
     *  element with the specified key does not already exist
     * @returns the value (newly initialized or already existing)
     */
    init(key: any[], init: () => T): T {
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
            const value = init();
            map.set(last, { value: value, next: new Map() });
            return value;
        } else {
            const node = map.get(last)!;
            if ('value' in node) return node.value!;
            return node.value = init();
        }
    }

    /**
     * Adds a new element with a specified key and value to the Map. If an element with the same 
     * key already exists, the element will be updated.
     * @param key 
     * @param value 
     */
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

    /**
     * Returns a specified element from the map.
     * @param key
     * @returns — the element associated with the specified key, if any, or undefined
     */
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