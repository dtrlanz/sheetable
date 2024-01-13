import { Constructor } from "./meta-props.js";
import { Orientation } from "./sheet-navigation.js";
import { SheetClient } from "./client.js";
type TableOptions = {
    context?: {
        readonly [k: string]: any;
    };
    client?: SheetClient;
    url?: string;
    sheetName?: string;
    orientation?: Orientation;
    firstHeaderRow?: number;
    firstDataRow?: number;
    dataRowCount?: number;
    firstColumn?: number;
    columnCount?: number;
    sharedIndex?: Table<any>;
    sampleLimit?: number;
};
export declare class Table<T extends object> {
    #private;
    readonly ctor: Constructor<T>;
    readonly context: {
        readonly [k: string]: any;
    };
    private readonly client;
    private readonly index;
    private readonly header;
    private readonly slots;
    private readonly changes;
    private rowStop;
    get lastSaved(): Date | undefined;
    private constructor();
    static open<T extends object>(ctor: Constructor<T>, options?: TableOptions): Promise<Table<T>>;
    static create<T extends object>(ctor: Constructor<T>, options?: TableOptions): Table<T>;
    static create<T extends object>(data: Iterable<T>, options?: TableOptions): Table<T>;
    at(idx: number): Promise<T | undefined>;
    /**
     * Retrieves a record based on indexed properties.
     * @param indexedValues — values of indexed properties in enumeration order
     * @returns — the record matching the given values, if any; otherwise `undefined`
     */
    get(...indexedValues: any[]): Promise<T | undefined>;
    /**
     * If a record with matching indexed properties exists, replaces that record with the new one.
     * Otherwise adds a new record.
     * @param value — the updated or added record
     * @returns — the numeric index of the updated or added record
     */
    set(record: T): number;
    save({ changesOnly, timeout, retryLimit }?: {
        changesOnly?: boolean;
        timeout?: number;
        retryLimit?: number;
    }): Promise<void>;
    private _save;
    private saveHeaders;
    private toCached;
}
export {};
