import { SpreadsheetClient } from "./client.js";
import { Index, getIndexKeys } from "./index.js";
import { Header } from "./headers.js";
import { getIndexTitles } from "./title.js";
import { createFromEntries, createRecursively } from "./type.js";
export class Table {
    ctor;
    context;
    client;
    index;
    header;
    slots = [];
    changes = {
        saveInProgress: undefined,
        saved: 0,
        current: 1,
    };
    rowStop = 0;
    #lastSaved;
    get lastSaved() { return this.#lastSaved; }
    constructor(ctor, context, client, header, index) {
        this.ctor = ctor;
        this.context = context;
        this.client = client;
        this.header = header;
        this.index = index;
    }
    static async open(ctor, options) {
        const client = options?.client ??
            new SpreadsheetClient(options?.url).getSheet(options?.sheetName, options?.orientation);
        const { headers, data } = await client.readTable(getIndexTitles(ctor));
        if (!data)
            throw new Error('client failed to return index data');
        // Create data structures for header, index, and table
        const header = Header.open(ctor, headers, options?.context);
        const index = new Index(ctor, header, options?.context);
        const table = new Table(ctor, options?.context ?? {}, client, header, index);
        // Initialize index
        let row = data.rowOffset;
        const frontMatterRowCount = options?.frontMatterRowCount ?? 0;
        for (const idxValues of index.getIndexedPropsFromRows(data.rows, data.colNumbers)) {
            // skip front matter
            if (row < data.rowOffset + frontMatterRowCount) {
                row++;
                continue;
            }
            // Note that initialization might be unsuccessful (in case of index collisions)
            index.init(idxValues, () => {
                // increment `idx` only if element is actually initialized
                const slot = {
                    idx: table.slots.length,
                    row,
                    changed: table.changes.current
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
    static create(data, options) {
        const client = options?.client ??
            new SpreadsheetClient(options?.url).getSheet(options?.sheetName, options?.orientation);
        // Get constructor from sample data or use constructor to create sample data
        let ctor;
        const samples = [];
        if (typeof data === 'function') {
            ctor = data;
            data = [];
            const obj = createFromEntries(ctor, []);
            if (!obj)
                throw new Error('Error constructing sample object; consider passing instances instead of class, implementing a zero-argument constructor, or adding a static factory method `fromEntries()`');
            samples.push(obj);
        }
        else {
            let sampleLimit = options?.sampleLimit ?? 1;
            if (sampleLimit < 1)
                throw new Error(`sampleLimit: ${sampleLimit} is invalid; must be >= 1`);
            for (const obj of data) {
                samples.push(obj);
                if (--sampleLimit < 1)
                    break;
            }
            if (samples.length < 1)
                throw new Error('Error constructing Table: data was empty; consider passing a class instead');
            ctor = Object.getPrototypeOf(samples[0]).constructor;
        }
        // Create data structures for header, index, and table
        const header = Header.create(ctor, samples, options?.context, options?.firstHeaderRow, options?.firstColumn);
        const index = new Index(ctor, header, options?.context);
        const table = new Table(ctor, options?.context ?? {}, client, header, index);
        // Initialize index
        const frontMatterRowCount = options?.frontMatterRowCount ?? 0;
        let row = header.firstRow + header.rowCount + frontMatterRowCount;
        for (const [idxValues, obj] of index.getIndexedPropsFromObjects(data)) {
            // Note that initialization might be unsuccessful (in case of index collisions)
            index.init(idxValues, () => {
                const slot = {
                    // increment `idx` only if element is actually initialized
                    idx: table.slots.length,
                    row,
                    changed: table.changes.current,
                    cached: table.toCached(obj)
                };
                table.slots.push(slot);
                // increment `row` only if element is actually initialized
                row++;
                return slot;
            });
        }
        table.rowStop = row;
        table.changes.saveInProgress = (async () => {
            try {
                // Ensure enough space for width of header and length of header + data
                await client.extend(row, header.firstCol + header.colCount);
                // Save headers
                await table.saveHeaders();
            }
            catch (_) {
            }
            finally {
                table.changes.saveInProgress = undefined;
            }
        })();
        // Save data
        table.save();
        return table;
    }
    async at(idx) {
        const slot = this.slots.at(idx);
        if (!slot)
            return undefined;
        // return cached object if available
        if (slot.cached)
            return slot.cached;
        // otherwise construct object from row data
        const [row] = await this.client.readRows(slot.row, slot.row + 1);
        const entries = [];
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const keyTuple = this.header.getKeyForColumns(this.header.firstCol + colIdx);
            if (!keyTuple)
                continue;
            entries.push([keyTuple, row[colIdx]]);
        }
        const obj = createRecursively(this.ctor, entries, this.context);
        if (Array.isArray(obj))
            throw new Error(`unexpected array when constructing element #${idx}: ${obj}`);
        // cache for later
        slot.cached = this.toCached(obj);
        return obj;
    }
    /**
     * Retrieves a record based on indexed properties.
     * @param indexedValues — values of indexed properties in enumeration order
     * @returns — the record matching the given values, if any; otherwise `undefined`
     */
    async get(...indexedValues) {
        const idx = this.index.get(indexedValues)?.idx;
        if (idx === undefined)
            return undefined;
        return this.at(idx);
    }
    /**
     * If a record with matching indexed properties exists, replaces that record with the new one.
     * Otherwise adds a new record.
     * @param value — the updated or added record
     * @returns — the numeric index of the updated or added record
     */
    set(record) {
        const indexedValues = getIndexKeys(this.ctor, this.context).map(k => record[k]);
        let slot = this.index.init(indexedValues, () => {
            const slot = {
                idx: this.slots.length,
                row: this.rowStop++,
                changed: this.changes.current,
            };
            this.slots.push(slot);
            return slot;
        });
        slot.changed = this.changes.current;
        slot.cached = this.toCached(record);
        return slot.idx;
    }
    async getRaw(rowOffset) {
        const row = this.header.firstRow + this.header.rowCount + rowOffset;
        const [rowData] = await this.client.readRows(row, row + 1);
        if (!rowData)
            return undefined;
        const entries = [];
        for (let colIdx = 0; colIdx < rowData.length; colIdx++) {
            const keyTuple = this.header.getKeyForColumns(this.header.firstCol + colIdx);
            if (!keyTuple)
                continue;
            entries.push([keyTuple, rowData[colIdx]]);
        }
        const obj = createRecursively(Object, entries);
        if (Array.isArray(obj))
            throw new Error(`unexpected array when constructing element`);
        return obj;
    }
    async setRaw(rowOffset, record) {
        const row = this.header.firstRow + this.header.rowCount + rowOffset;
        const keyTuples = [];
        for (let colIdx = 0; colIdx < this.header.colCount; colIdx++) {
            const kt = this.header.getKeyForColumns(this.header.firstCol + colIdx);
            if (!kt)
                continue;
            keyTuples.push(kt);
        }
        const rowData = [];
        for (const kt of keyTuples) {
            let value = record;
            for (const key of kt) {
                if (value && typeof value === 'object') {
                    value = value[key];
                }
                else {
                    value = undefined;
                    break;
                }
            }
            rowData.push(value);
        }
        await this.client.writeRows(row, [rowData]);
        for (const s of this.slots) {
            if (row === s.row) {
                s.cached === undefined;
                // already saved directly (bypassing cache)
                s.changed = this.changes.saved;
            }
        }
    }
    async save({ changesOnly = true, timeout = 30000, retryLimit = 1 } = {}) {
        const milestone = this.changes.current;
        // Avoid racing several write requests simultaneously. Wait for previous request to
        // succeed or fail.
        try {
            await this.changes.saveInProgress;
        }
        catch (_) { }
        // Race new save request against timeout.
        this.changes.saveInProgress = Promise.race([
            (async () => {
                // Only proceed if still necessary. A concurrent method call might have saved in
                // the meantime.
                if (this.changes.saved < milestone) {
                    await this._save(changesOnly);
                }
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Error saving table: request timeout reached')), timeout)),
        ]);
        try {
            // Await save request or timeout
            await this.changes.saveInProgress;
        }
        catch (error) {
            // Retry specified number of times
            if (retryLimit >= 1) {
                await this.save({ timeout, retryLimit: retryLimit - 1 });
            }
            else {
                throw error;
            }
        }
    }
    async _save(changesOnly) {
        // Ensure data can fit in table
        await this.client.extend(this.rowStop);
        // Collect data changed since last successful save
        let arr;
        let firstRow = 0, lastRow = 0;
        this.changes.current++;
        const timeLastSaved = new Date();
        for (const s of this.slots) {
            if (changesOnly && s.changed <= this.changes.saved) {
                arr?.push(undefined);
            }
            else if (arr) {
                arr.push(s.cached);
                lastRow = s.row;
            }
            else {
                arr = [s.cached];
                firstRow = lastRow = s.row;
            }
        }
        // Save to sheet
        if (!arr)
            return;
        await this.client.writeRows(firstRow, arr.slice(0, lastRow - firstRow + 1)
            .map(r => r ? this.header.getRowValues(r) : undefined));
        // Update status
        this.changes.saved = this.changes.current;
        this.changes.current++;
        this.#lastSaved = timeLastSaved;
    }
    async saveHeaders() {
        const rows = this.header.getHeaderRows();
        await this.client.writeRows(this.header.firstRow, rows);
    }
    toCached(value) {
        return value;
    }
}
