import { SheetLike } from "./sheet-navigation.js";
import { Constructor } from "./meta-props.js";
import { Orientation } from "./sheet-navigation.js";
import { Value } from "./values.js";
import { SheetClient, SpreadsheetClient } from "./client.js";
import { Index, getIndexKeys } from "./index.js";
import { Header } from "./headers.js";
import { getIndexTitles } from "./title.js";
import { createFromEntries, createRecursively } from "./type.js";

type TableOptions = {
    context?: { readonly [k: string]: any },
    client?: SheetClient,
    url?: string,
    sheetName?: string,
    orientation?: Orientation,
    firstHeaderRow?: number,
    firstDataRow?: number,
    dataRowCount?: number,
    firstColumn?: number,
    columnCount?: number,
    sharedIndex?: Table<any>,
    sampleLimit?: number,
};

type Slot<T> = { 
    idx: number, 
    row: number, 
    changed: boolean,
    cached?: T,
};

export class Table<T extends object> {
    readonly ctor: Constructor<T>;
    readonly context: { readonly [k: string]: any };
    private readonly client: SheetClient;
    private readonly index: Index<T, Slot<T>>;
    private readonly header: Header<T>;
    private readonly slots: Slot<T>[] = [];
    private saved: Promise<void> = Promise.resolve();
    private rowStop: number = 0;
    

    private constructor(
        ctor: Constructor<T>,
        context: { readonly [k: string]: any },
        client: SheetClient,
        header: Header<T>,
        index: Index<T, Slot<T>>,
    ) {
        this.ctor = ctor;
        this.context = context;
        this.client = client;
        this.header = header;
        this.index = index;
    }

    static async open<T extends object>(ctor: Constructor<T>, options?: TableOptions): Promise<Table<T>> {
        const client = options?.client ?? 
            new SpreadsheetClient(options?.url).getSheet(options?.sheetName, options?.orientation);

        const { headers, data } = await client.get(getIndexTitles(ctor));
        if (!data) throw new Error('client failed to return index data');

        // Create data structures for header, index, and table
        const header = Header.open(ctor, headers, options?.context);
        const index = new Index<T, Slot<T>>(ctor, header, options?.context);
        const table = new Table(
            ctor,
            options?.context ?? {},
            client,
            header,
            index,
        );

        // Initialize index
        let row = data.rowOffset;
        for (const idxValues of index.getIndexedPropsFromRows(data.rows, data.colNumbers)) {
            // Note that initialization might be unsuccessful (in case of index collisions)
            index.init(idxValues, () => {
                // increment `idx` only if element is actually initialized
                const slot = { 
                    idx: table.slots.length, 
                    row, 
                    changed: false 
                };
                table.slots.push(slot);
                return slot;
            });
            // increment `row` regardless of whether initialization takes place
            row++;
        }
        table.rowStop = row;

        return table;
    }

    static create<T extends object>(ctor: Constructor<T>, options?: TableOptions): Table<T>;
    static create<T extends object>(data: Iterable<T>, options?: TableOptions): Table<T>;
    static create<T extends object>(data: Constructor<T> | Iterable<T>, options?: TableOptions): Table<T> {
        const client = options?.client ?? 
            new SpreadsheetClient(options?.url).getSheet(options?.sheetName, options?.orientation);

        // Get constructor from sample data or use constructor to create sample data
        let ctor: Constructor<T>;
        const samples: T[] = [];
        if (typeof data === 'function') {
            ctor = data;
            data = [];
            const obj = createFromEntries(ctor, []);
            if (!obj) throw new Error('Error constructing sample object; consider passing instances instead of class, implementing a zero-argument constructor, or adding a static factory method `fromEntries()`');
            samples.push(obj);
        } else {
            let sampleLimit = options?.sampleLimit ?? 1;
            if (sampleLimit < 1) throw new Error(`sampleLimit: ${sampleLimit} is invalid; must be >= 1`);
            for (const obj of data) {
                samples.push(obj);
                if (--sampleLimit < 1) break;
            }
            if (samples.length < 1) throw new Error('Error constructing Table: data was empty; consider passing a class instead');
            ctor = Object.getPrototypeOf(samples[0]).constructor;
        }

        // Create data structures for header, index, and table
        const header = Header.create(ctor, samples, options?.context, options?.firstHeaderRow, options?.firstColumn);
        const index = new Index<T, Slot<T>>(ctor, header, options?.context);
        const table = new Table(
            ctor,
            options?.context ?? {},
            client,
            header,
            index,
        );

        // Initialize index
        let row = header.firstRow + header.rowCount;
        for (const [idxValues, obj] of index.getIndexedPropsFromObjects(data)) {
            // Note that initialization might be unsuccessful (in case of index collisions)
            index.init(idxValues, () => {
                const slot = { 
                    // increment `idx` only if element is actually initialized
                    idx: table.slots.length, 
                    row, 
                    changed: true,
                    cached: table.toCached(obj) 
                };
                table.slots.push(slot);
                // increment `row` only if element is actually initialized
                row++;
                return slot;
            });
        }
        table.rowStop = row;
        
        table.saved = (async () => {
            // Ensure enough space for width of header and length of header + data
            await client.extend(row, header.firstCol + header.colCount);
            // Save headers
            await table.saveHeaders();
        })();
        // Save data
        table.save();

        return table;
    }

    async at(idx: number): Promise<T | undefined> {
        const slot = this.slots.at(idx);
        if (!slot) return undefined;
        // return cached object if available
        if (slot.cached) return slot.cached;
        // otherwise construct object from row data
        const { rows: [row], colNumbers } = await this.client.getRows(slot.row, slot.row + 1);
        const entries: [(string | symbol | number)[], any][] = [];
        for (let colIdx = 0; colIdx < colNumbers.length; colIdx++) {
            const keyTuple = this.header.getKeyForColumns(colNumbers[colIdx]);
            if (!keyTuple) continue;
            entries.push([keyTuple, row[colIdx]]);
        }
        const obj = createRecursively(this.ctor, entries, this.context);
        if (Array.isArray(obj)) throw new Error(`unexpected array when constructing element #${idx}: ${obj}`);
        // cache for later
        slot.cached = this.toCached(obj);
        return obj;
    }

    /**
     * Retrieves a record based on indexed properties.
     * @param indexedValues — values of indexed properties in enumeration order
     * @returns — the record matching the given values, if any; otherwise `undefined`
     */
    async get(...indexedValues: any[]): Promise<T | undefined> {
        const idx = this.index.get(indexedValues)?.idx;
        if (idx === undefined) return undefined;
        return this.at(idx);
    }

    /**
     * If a record with matching indexed properties exists, replaces that record with the new one.
     * Otherwise adds a new record.
     * @param value — the updated or added record
     * @returns — the numeric index of the updated or added record
     */
    set(record: T): number {
        const indexedValues = getIndexKeys(this.ctor, this.context).map(k => (record as any)[k]);

        let slot = this.index.init(indexedValues, () => {
            const slot = { 
                idx: this.slots.length, 
                row: this.rowStop++,
                changed: true,
            };
            this.slots.push(slot);
            return slot;
        });
        slot.changed = true;
        slot.cached = this.toCached(record);
        return slot.idx;
    }

    save(): Promise<void> {
        // avoid racing write requests
        this.saved = this.saved.then(async () => {
            // collect data changed since last save
            let arr: (T | undefined)[] | undefined;
            let firstRow = 0, lastRow = 0;
            for (const s of this.slots) {
                if (!s.changed) {
                    arr?.push(undefined);
                } else if (arr) {
                    arr.push(s.cached);
                    s.changed = false;
                    lastRow = s.row;
                } else {
                    arr = [s.cached];
                    s.changed = false;
                    firstRow = lastRow = s.row;
                }
            }
            // save to sheet
            if (!arr) return;
            await this.client.extend(this.rowStop);
            await this.client.writeRows(firstRow, 
                arr.slice(0, lastRow - firstRow + 1)
                .map(r => r ? this.header.getRowValues(r) : undefined)
            );
        });
        return this.saved;
    }

    private async saveHeaders(): Promise<void> {
        const rows = this.header.getHeaderRows();
        await this.client.writeRows(this.header.firstRow, rows);
    }

    private toCached<V extends T | undefined>(value: V ): V {
        return value;
    }
}
