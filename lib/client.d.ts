import { SheetLike, Orientation } from "./sheet-navigation.js";
import { Branch } from "./headers.js";
import { Scalar } from "./values.js";
import { SpreadsheetRequest, SpreadsheetResponse } from "./server.js";
export declare class SpreadsheetClient {
    private url?;
    private id?;
    private name?;
    private sheetList?;
    static serverFunctionName: string;
    constructor(urlOrId?: string);
    private request;
    getName(): string | undefined;
    getSheet(sheet?: string | {
        name?: string;
        id?: number;
    }, orientation?: Orientation): SheetClient;
    getSheetByIndex(index: number, orientation?: Orientation): Promise<SheetClient>;
    getSheetList(): Promise<{
        id: number;
        name: string;
    }[]>;
    insertSheet(name?: string, index?: number): Promise<{
        id: number;
        name: string;
        index: number;
    }>;
    deleteSheet(sheet: string | {
        name?: string;
        id: number;
    }): Promise<void>;
}
export type SheetEvent = 'structuralChange';
export type SheetEventParams<E extends SheetEvent> = E extends 'structuralChange' ? [
    change: 'deleted' | 'inserted',
    dimension: 'rows' | 'columns',
    position: number,
    count: number
] : never;
export declare class SheetClient {
    #private;
    readonly sheetName?: string;
    readonly sheetId?: number;
    readonly orientation: Orientation;
    private readonly request;
    private requestsSent;
    private requestsQueued;
    private listeners;
    get rowStart(): number;
    get rowStop(): number | undefined;
    get colStart(): number;
    get colStop(): number | undefined;
    constructor(request: (req: SpreadsheetRequest) => Promise<SpreadsheetResponse>, sheetName?: string, sheetId?: number, orientation?: Orientation, rowStart?: number, rowStop?: number, colStart?: number, colStop?: number);
    static fromSheet(sheet: SheetLike, sheetName?: string, orientation?: Orientation, rowStart?: number, rowStop?: number, colStart?: number, colStop?: number): SheetClient;
    addEventListener<E extends SheetEvent>(event: E, listener: (...args: SheetEventParams<E>) => void): void;
    removeEventListener(event: SheetEvent, listener: (...args: any[]) => void): void;
    private queueRequest;
    private sendRequests;
    private onStructuralChange;
    /**
     * Reads the sheet as a table with table headers and column data.
     *
     * This method is primarily useful for importing a table from a sheet because it allows
     * reading the header rows and importing specific columns (typically the indexed columns) in
     * a single request.
     *
     * @param columns - a string array of the top-level column titles indicating which columns
     * are to be read, or 'all' or 'none'
     * @returns Promise of an object with two properties, `headers` and `data` (the latter is only
     * present when column data is requested)
     */
    readTable(columns: 'all' | 'none' | string[]): Promise<{
        headers: Branch[];
        data?: {
            rows: Scalar[][];
            colNumbers: number[];
            rowOffset: number;
        };
    }>;
    /**
     * Returns values of the specified rows.
     *
     * @param rowStart - the position (i.e., 1-based index) of the first row to be read
     * @param rowStop - the position of the row at which to stop, i.e., the row after the last row
     * to be included
     * @returns Promise<Scalar[][]> - 2-dimensional array of values
     */
    readRows(rowStart?: number, rowStop?: number): Promise<Scalar[][]>;
    writeRows(rowStart: number, rows: (Scalar[] | undefined)[]): Promise<void>;
    insertRows(rowPosition: number, numRows?: number): Promise<void>;
    insertColumns(columnPosition: number, numColumns?: number): Promise<void>;
    deleteRows(rowPosition: number, numRows?: number): Promise<void>;
    deleteColumns(columnPosition: number, numColumns?: number): Promise<void>;
    extend(rowStop?: number, colStop?: number): Promise<void>;
}
