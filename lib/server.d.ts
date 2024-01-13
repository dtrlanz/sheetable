/// <reference types="google-apps-script" />
import { SheetLike, Orientation } from "./sheet-navigation.js";
import { Branch } from "./headers.js";
import { Sendable } from "./values.js";
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
export type SpreadsheetRequest = {
    spreadsheetUrl?: string;
    spreadsheetId?: string;
    listSheets?: boolean;
    insertSheet?: boolean | {
        index?: number;
    };
    sheetId?: number;
    sheetName?: string;
    deleteSheet?: boolean;
    renameSheet?: string;
    orientation?: Orientation;
    limit?: {
        rowStart?: number;
        rowStop?: number;
        colStart?: number;
        colStop?: number;
    };
    readHeaders?: boolean;
    readData?: boolean | {
        colNumbers?: number[];
        colHeaders?: string[];
        rowStart?: number;
        rowStop?: number;
    };
    insertRows?: {
        position: number;
        count?: number;
    };
    insertColumns?: {
        position: number;
        count?: number;
    };
    deleteRows?: {
        start: number;
        stop: number;
    } | {
        start: number;
        stop: number;
    }[];
    deleteColumns?: {
        start: number;
        stop: number;
    } | {
        start: number;
        stop: number;
    }[];
    writeData?: {
        colNumbers?: number[];
        rowStart: number;
        rows: (Sendable[] | undefined)[];
    };
    skipConversion?: boolean;
};
export type SpreadsheetResponse = {
    spreadsheet?: {
        url: string;
        id: string;
        name: string;
        sheets?: {
            id: number;
            name: string;
        }[];
    };
    deletedSheet?: {
        id: number;
        index: number;
        name: string;
    };
    renamedSheet?: {
        id: number;
        index: number;
        oldName: string;
        newName: string;
    };
    insertedSheet?: {
        id: number;
        index: number;
        name: string;
    };
    sheet?: {
        id: number;
        index: number;
        name: string;
    };
    headers?: Branch[];
    data?: {
        rows: Sendable[][];
        colNumbers: number[];
        rowOffset: number;
    };
    insertedRows?: boolean;
    insertedColumns?: boolean;
    deletedRows?: boolean;
    deletedColumns?: boolean;
    wroteData?: boolean;
};
export declare class SpreadsheetServer {
    readonly spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet;
    readonly sheet?: SheetLike;
    constructor();
    constructor(spreadsheet: Spreadsheet);
    constructor(sheet: SheetLike);
    processRequest(req: SpreadsheetRequest): SpreadsheetResponse;
}
export {};
