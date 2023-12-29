import { SheetLike, Orientation, Region, TableWalker } from "./sheet-navigation.js";
import { Branch, getHeadersHelper } from "./headers.js";
import { Sendable } from "./values.js";

type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

export type SpreadsheetRequest = {
    spreadsheetUrl?: string,
    spreadsheetId?: string,
    listSheets?: boolean,
    insertSheet?: boolean | {
        index?: number,
    },
    sheetId?: number,
    sheetName?: string,
    deleteSheet?: boolean,
    renameSheet?: string,
    orientation?: Orientation,
    limit?: {
        rowStart?: number,
        rowStop?: number,
        colStart?: number,
        colStop?: number,
    },
    getHeaders?: boolean,
    getData?: boolean | {
        colNumbers?: number[],      // `colNumbers` takes precedence
        colHeaders?: string[],      // `colHeaders` ignored if `colNumbers` is present
        rowStart?: number,
        rowStop?: number,
    },
    insertRows?: {
        position: number, 
        count?: number
    },
    insertColumns?: {
        position: number, 
        count?: number
    },
    deleteRows?: {
        position: number, 
        count?: number
    },
    deleteColumns?: {
        position: number, 
        count?: number
    },
    setData?: {
        colNumbers?: number[],
        rowStart: number,
        rows: Sendable[][],
    },
};

export type SpreadsheetResponse = {
    spreadsheet?: {
        url: string,
        id: string,
        name: string,
        sheets?: {
            id: number,
            name: string,
        }[],
    },
    deletedSheet?: {
        id: number,
        index: number,
        name: string,
    },
    renamedSheet?: {
        id: number,
        index: number,
        oldName: string,
        newName: string,
    },
    insertedSheet?: {
        id: number,
        index: number,
        name: string,
    },
    sheet?: {
        id: number,
        index: number,
        name: string,
    },
    headers?: Branch[],
    data?: {
        rows: Sendable[][],
        colNumbers: number[],
        rowOffset: number,
    },
    insertedRows?: boolean,
    insertedColumns?: boolean,
    deletedRows?: boolean,
    deletedColumns?: boolean,
    setData?: boolean,
};

export class SpreadsheetServer {
    readonly spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet;
    readonly sheet?: SheetLike;

    constructor();
    constructor(spreadsheet: Spreadsheet);
    constructor(sheet: SheetLike);
    constructor(obj?: Spreadsheet | SheetLike) {
        if (obj && 'getSheets' in obj) {
            this.spreadsheet = obj;
        } else {
            this.sheet = obj;
        }
        this.do = this.do.bind(this);
    }

    do(req: SpreadsheetRequest): SpreadsheetResponse {
        let spreadsheet: Spreadsheet;
        let sheet: SheetLike | undefined;
        let sheetList: { id: number, name: string }[] | undefined;
        let deletedSheet: SpreadsheetResponse['deletedSheet'];
        let renamedSheet: SpreadsheetResponse['renamedSheet'];
        let insertedSheet: SpreadsheetResponse['insertedSheet'];
        let insertedRows: SpreadsheetResponse['insertedRows'];
        let insertedColumns: SpreadsheetResponse['insertedColumns'];
        let deletedRows: SpreadsheetResponse['insertedRows'];
        let deletedColumns: SpreadsheetResponse['insertedColumns'];
        let headers: SpreadsheetResponse['headers'];
        let data: SpreadsheetResponse['data'];
        let setData: SpreadsheetResponse['setData'];
    
        /****************************/
        /*  Spreadsheet operations  */
        /****************************/

        // If a sheet was provided at construction, this instance is restricted to operations
        // within that sheet. So ignore any requests pertaining to the parent spreadsheet.
        if (!this.sheet) {
            // If no spreadsheet was provided at construction, open the one with the id/url provided.
            // If none, try using the active spreadsheet.
            spreadsheet = this.spreadsheet
                ?? (req.spreadsheetId ? SpreadsheetApp.openById(req.spreadsheetId)
                : req.spreadsheetUrl ? SpreadsheetApp.openByUrl(req.spreadsheetUrl)
                : SpreadsheetApp.getActiveSpreadsheet());
            if (!spreadsheet) return {};

            // Retrieve sheet by id or by name, or default to using active sheet (if any).
            if (req.sheetId != undefined) {
                for (const s of spreadsheet.getSheets()) {
                    if (s.getSheetId() === req.sheetId) {
                        sheet = s;
                        break;
                    }
                }
            } else if (req.sheetName != undefined) {
                sheet = spreadsheet.getSheetByName(req.sheetName) ?? undefined;
            } else {
                sheet = SpreadsheetApp.getActiveSheet();
            }

            // ** Spreadsheet operations requiring a specific existing sheet **
            if (sheet) {
                // You can either rename a sheet or delete it, not both in the same request.
                // Rename sheet
                if (req.renameSheet) {
                    renamedSheet = {
                        id: (sheet as GoogleAppsScript.Spreadsheet.Sheet).getSheetId(),
                        index: (sheet as GoogleAppsScript.Spreadsheet.Sheet).getIndex(),
                        oldName: sheet.getName(),
                        newName: req.renameSheet,
                    };
                    sheet.setName(req.renameSheet);
                // Delete sheet
                } else if (req.deleteSheet) {
                    deletedSheet = {
                        id: (sheet as GoogleAppsScript.Spreadsheet.Sheet).getSheetId(),
                        index: (sheet as GoogleAppsScript.Spreadsheet.Sheet).getIndex(),
                        name: sheet.getName(),
                    };
                    spreadsheet.deleteSheet(sheet as GoogleAppsScript.Spreadsheet.Sheet);
                    sheet = undefined;
                }
            }
            
            // ** Spreadsheet operations not requiring a specific existing sheet **
            // Insert sheet
            if (req.insertSheet) {
                const index: any = typeof req.insertSheet === 'object' ? req.insertSheet.index 
                    : undefined;
                if (req.sheetName) {
                    sheet = spreadsheet.insertSheet(req.sheetName, index);
                } else {
                    sheet = spreadsheet.insertSheet(index);
                }
                insertedSheet = {
                    id: (sheet as GoogleAppsScript.Spreadsheet.Sheet).getSheetId(),
                    index: (sheet as GoogleAppsScript.Spreadsheet.Sheet).getIndex(),
                    name: sheet.getName(),
                };
            }
            
            // Get sheet list
            if (req.listSheets) {
                sheetList = spreadsheet.getSheets().map(s => ({
                    id: s.getSheetId(),
                    name: s.getSheetName(),
                }));
            }
        }

        /**********************/
        /*  Sheet operations  */
        /**********************/

        // If a sheet was just inserted or renamed, keep using that.
        // If a sheet was provided at construction, use that.
        sheet ??= this.sheet;
        if (!sheet) return getResponse();

        // *** Structural changes (row/column deletion & insertion) ***

        // Since we're operating directly on a `SheetLike` and not going through a `Region`, we
        // have to account for sheet orientation manually.

        // Handle row/column deletions first.
        let { deleteRows, deleteColumns } = req;
        if (req.orientation === 'transposed') {
            [deleteRows, deleteColumns] = [deleteColumns, deleteRows];
        }
        if (deleteRows) {
            sheet.deleteRows(deleteRows.position, deleteRows.count);
            deletedRows = true;
        }
        if (deleteColumns) {
            sheet.deleteColumns(deleteColumns.position, deleteColumns.count);
            deletedColumns = true;
        }
        if (req.orientation === 'transposed') {
            [deletedRows, deletedColumns] = [deletedColumns, deletedRows];
        }

        // Handle row/column insertions second.
        let { insertRows, insertColumns } = req;
        if (req.orientation === 'transposed') {
            [insertRows, insertColumns] = [insertColumns, insertRows];
        }
        if (insertRows) {
            sheet.insertRows(insertRows.position, insertRows.count);
            insertedRows = true;
        }
        if (insertColumns) {
            sheet.insertColumns(insertColumns.position, insertColumns.count);
            insertedColumns = true;
        }
        if (req.orientation === 'transposed') {
            [insertRows, insertColumns] = [insertColumns, insertRows];
        }

        // *** Writing & reading data ***
        const region = Region
            .fromSheet(sheet, req.orientation)
            .crop(req.limit?.rowStart, req.limit?.rowStop, 
                req.limit?.colStart, req.limit?.colStop);

        // Write before reading.
        setData = false;
        if (req.setData) {
            const colNumbers = (req.setData.colNumbers ??
                // default to all columns in the given range (or as much as there is data)
                intRange(region.colStart, region.colStart + (req.setData.rows[0]?.length ?? 0)))
                // ensure column numbers are within region
                .filter(v => v >= region.colStart && v < region.colStop);

            if (colNumbers.length !== 0) {
                const colRange = isRange(colNumbers);
                if (colRange) {
                    // Optimize for contiguous columns (probably more common).
                    const writeRegion = region.crop(
                        req.setData.rowStart, req.setData.rowStart + req.setData.rows.length, 
                        colRange.start, colRange.stop
                    );
                    // ensure rows fit within region
                    if (req.setData.rowStart < writeRegion.rowStart) {
                        req.setData.rows.splice(0, writeRegion.rowStart - req.setData.rowStart);
                    }
                    if (req.setData.rows.length > writeRegion.rowStop - writeRegion.rowStart) {
                        req.setData.rows.length = writeRegion.rowStop - writeRegion.rowStart;
                    }
                    // ensure columns fit within region
                    for (const row of req.setData.rows) {
                        row.length = colNumbers.length;
                    }
                    // write data
                    writeRegion.writeAll(req.setData.rows);
                } else {
                    // Pick out non-contiguous columns.

                    // The following implementation is perhaps not the most elegant but I'm 
                    // guessing it would be reasonably efficient. Another, possibly better
                    // option would be to write each column (or even each set of contiguous
                    // columns) in turn. But there's no point implementing that before I have
                    // a system in place to benchmark it (and a use case!).

                    // 1. read existing data
                    const min = colNumbers.reduce((a, b) => a < b ? a : b);
                    const max = colNumbers.reduce((a, b) => a > b ? a : b);
                    const writeRegion = region.crop(req.setData.rowStart, 
                        req.setData.rowStart + req.setData.rows.length, min, max + 1);
                    const data = writeRegion.readAll();
                    // 2. overwrite with new data
                    for (let i = 0; i < data.length; i++) {
                        for (let j = 0; j < colNumbers.length; j++) {
                            data[i][colNumbers[j] - min] = req.setData.rows[i][j];
                        }
                    }
                    // 3. write data back to sheet
                    writeRegion.writeAll(data);
                }
                setData = true;
            }
        }

        // Read data last.
        // A request would not usually include both read & write instructions. But if it does, 
        // data returned should reflect the latest changes.
        
        // Need to find headers if:
        // - requester asked for headers OR
        // - requester asked for data based on headers (`colHeaders: [...]`)
        const headersNeeded = req.getHeaders || typeof req.getData === 'object' 
            && req.getData.colHeaders && !req.getData.colNumbers;

        
        let dataRegion = region;
        if (headersNeeded) {
            const { branches, rowStop } = getHeadersHelper(new TableWalker(region));
            headers = branches;
            // data starts starts after last header row (at minimum)
            // data width limited to header width
            dataRegion = dataRegion.crop(rowStop, undefined, 
                branches[0].start, branches[branches.length - 1].stop);
        }

        // Retrieve requested columns
        if (req.getData) {
            if (typeof req.getData === 'object') {
                dataRegion = dataRegion.crop(req.getData.rowStart, req.getData.rowStop);
            }

            if (req.getData === true || (!req.getData.colNumbers && !req.getData.colHeaders)) {
                // include all columns
                data = {
                    rows: dataRegion.readAll(),
                    colNumbers: intRange(dataRegion.colStart, dataRegion.colStop),
                    rowOffset: dataRegion.rowStart,
                };
            } else {
                // include specific columns
                let colNumbers = req.getData.colNumbers?.filter(v => 
                    // ensure column numbers are within data region
                    v >= dataRegion.colStart && v < dataRegion.colStop);

                if (!colNumbers) {
                    colNumbers = [];
                    if (!headers || !req.getData.colHeaders) throw new Error('unreachable');
                    // Note: The `colHeaders` array specifies top-level headers. If any header spans
                    // multiple columns, include all columns.
                    for (const h of headers) {
                        if (req.getData.colHeaders.includes(h.label)) {
                            colNumbers.splice(colNumbers.length, 0, ...intRange(h.start, h.stop));
                        }
                    }
                }
                const colRange = isRange(colNumbers);
                if (colRange) {
                    // optimize for contiguous columns (more common)
                    dataRegion = dataRegion.crop(undefined, undefined, colRange.start, colRange.stop);
                    data = {
                        rows: dataRegion.readAll(),
                        colNumbers: intRange(dataRegion.colStart, dataRegion.colStop),
                        rowOffset: dataRegion.rowStart,
                    };
                } else {
                    // pick out non-contiguous columns (less common)
                    const colOffset = dataRegion.colStart;
                    data = {
                        rows: dataRegion.readAll().map(
                            row => colNumbers!.map(
                                n => row[n - colOffset]
                        )),
                        colNumbers: colNumbers,
                        rowOffset: dataRegion.rowStart,
                    };
                }
            }
        }

        return getResponse();

        function getResponse(): SpreadsheetResponse {
            const sheetInfo = sheet ? {
                id: (sheet as any).getSheetId?.() ?? 0,
                index: (sheet as any).getIndex?.() ?? 0,
                name: sheet.getName(),
            }: undefined;
            return {
                spreadsheet: spreadsheet ? {
                    id: spreadsheet.getId(),
                    url: spreadsheet.getUrl(),
                    name: spreadsheet.getName(),
                    sheets: sheetList,
                } : undefined,
                deletedSheet, 
                renamedSheet, 
                insertedSheet,
                sheet: sheetInfo,
                headers, 
                data, 
                insertedColumns, 
                insertedRows, 
                deletedRows,
                deletedColumns,
                setData,
            };
        }
    }
}

function intRange(start: number, stop: number): number[] {
    const r = [];
    for (let i = start; i < stop; i++) {
        r.push(i);
    }
    return r;
}

function isRange(arr: number[]): { start: number, stop: number } | false {
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] !== arr[0] + i) return false;
    }
    return { 
        start: arr[0],
        stop: arr[0] + arr.length,
    };
}