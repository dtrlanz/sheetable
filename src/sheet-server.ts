import { SheetLike, Orientation, Region, TableWalker } from "./sheet-navigation.js";
import { Branch, getHeadersHelper } from "./headers.js";
import { Sendable, toSendable } from "./values.js";

export function getSheet(info: Sheetable.SheetInfo): { spreadsheet: Spreadsheet, sheet: Sheet, orientation: Sheetable.Orientation } {
    let spreadsheet: Spreadsheet;
    let sheet: Sheet;
    if (!info.url && !info.id) {
        spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        if (!info.sheetName) {
            sheet = spreadsheet.getActiveSheet();
        }
    } else {
        if (info.url) {
            spreadsheet = SpreadsheetApp.openByUrl(info.url)
        } else {
            spreadsheet = SpreadsheetApp.openById(info.id!);
        }
    }
    if (info.sheetName) {
        const s = spreadsheet.getSheetByName(info.sheetName);
        if (!s) throw new Error(`Sheet named '${info.sheetName} does not exist.`);
        sheet = s;
    } else {
        sheet = spreadsheet.getSheets()[0];
    }
    const orientation = info.orientation ?? 'normal';
    return { spreadsheet, sheet, orientation };
}

export function getSheetData(info: Sheetable.SheetInfo = {}, rowStart: number, rowStop?: number, columnLabels?: string[]): Sheetable.SheetData {
    const { spreadsheet, sheet, orientation } = getSheet(info);
    const region = Sheetable.Region.fromSheet(sheet, orientation).resize(undefined, rowStop);
    const branches = Sheetable.getHeadersForClient(new Sheetable.TableWalker(region));

    // return all columns by default
    columnLabels ??= branches.map(br => br.label);

    const columnData: Sheetable.Sendable[][] = [];
    for (const label of columnLabels) {
        for (const br of branches) {
            if (br.label === label) {
                for (let col = br.start; col < br.stop; col++) {
                    // note that column data will include header row(s)
                    const walker = new Sheetable.TableWalker(region, rowStart, col)
                    // use 0-indexed arrays for consistency
                    columnData[col - 1] = walker.map(1, 0, scalarToSendable);
                }
                break;
            }
        }
    }
    
    return {
        url: spreadsheet.getUrl(),
        sheetName: sheet.getName(),
        orientation: orientation,
        headers: branches,
        columns: columnData,
        rowOffset: rowStart,
    }
}

export function getSheetColumns(info: Sheetable.SheetInfo = {}, columns: number[], rowStart: number, rowStop?: number): Sheetable.SheetColumns {
    const { sheet, orientation } = getSheet(info);
    const region = Sheetable.Region.fromSheet(sheet, orientation).resize(undefined, rowStop);

    const columnData: Sheetable.Sendable[][] = [];
    for (const col of columns) {
        const walker = new Sheetable.TableWalker(region, rowStart, col)
        // use 0-indexed arrays for consistency
        columnData[col - 1] = walker.map(1, 0, scalarToSendable);
    }
    
    return {
        columns: columnData,
        rowOffset: rowStart,
    }
}

function writeSheetRow(info: Sheetable.SheetInfo, row: number, vals: Sheetable.Sendable[], checkState?: Sheetable.CellCheck) {
    const arr = vals.map(v =>
        typeof v !== 'object' ? v
            : v === null ? null
            : Sheetable.SENDABLE_DATE_KEY in v ? new Date(v[Sheetable.SENDABLE_DATE_KEY] as number)
            : '[internal error at writeSheetRow]'
    );
    const { sheet, orientation } = getSheet(info);
    const region = Sheetable.Region.fromSheet(sheet, orientation);
    region.writeRow(row, arr, 'encroach');
}

function scalarToSendable(val: any): Sheetable.Sendable {
    if (typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean' ||
        typeof val === 'undefined') 
    {
        return val;
    } else if (Date.prototype.isPrototypeOf(val)) {
        return (val as Date).getTime();
    }
}

type SheetRequest = {
    orientation: Orientation,
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
        index: number, 
        count?: number
    },
    insertColumns?: {
        index: number, 
        count?: number
    },
    setData?: {
        colNumbers?: number[],
        rowStart: number,
        rows: Sendable[][],
    },
};

type SheetResponse = {
    headers?: Branch[],
    data?: {
        rows: Sendable[][],
        colNumbers: number[],
        rowOffset: number,
    },
    insertedRows?: boolean,
    insertedColumns?: boolean,
    setData?: boolean,
};

export class SheetServer {
    sheet: SheetLike;

    constructor(sheet: SheetLike) {
        this.sheet = sheet;
    }

    request(req: SheetRequest): SheetResponse {
        // *** Structural changes (row/column deletion & insertion) ***
        // Handle row/column deletions first.
        
        /* not yet implemented */

        // Handle row/column insertions second.
        let insertedRows = false, insertedColumns = false;
        // Since we're operating directly on a `SheetLike` and not going through a `Region`, we
        // have to account for sheet orientation manually.
        const insertRows = req.orientation === 'normal' ? req.insertRows : req.insertColumns;
        const insertColumns = req.orientation === 'normal' ? req.insertColumns : req.insertRows;
        if (insertRows) {
            this.sheet.insertRows(insertRows.index, insertRows.count);
            insertedRows = true;
        }
        if (insertColumns) {
            this.sheet.insertColumns(insertColumns.index, insertColumns.count);
            insertedColumns = true;
        }

        // *** Writing & reading data ***
        const region = Region
            .fromSheet(this.sheet, req.orientation)
            .crop(req.limit?.rowStart, req.limit?.rowStop, 
                req.limit?.colStart, req.limit?.colStop);

        // Write before reading.
        let setData = false;
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
                    // a system in place to benchmark it.

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

        let headers: SheetResponse['headers'];
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
        let data: SheetResponse['data'];
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

        return { headers, data, insertedColumns, insertedRows, setData };
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

export class SheetClient {
    readonly url?: string;
    readonly sheetName?: string;
    readonly orientation: Orientation;
    private readonly request: (req: SheetRequest) => Promise<SheetResponse>;
    #rowStart: number;
    #rowStop: number;
    #colStart: number;
    #colStop: number;
    get rowStart() { return this.#rowStart; }
    get rowStop() { return this.#rowStop; }
    get colStart() { return this.#colStart; }
    get colStop() { return this.#colStop; }

    private constructor(
        url: string | undefined, 
        sheetName: string | undefined, 
        orientation: Orientation, 
        request: (req: SheetRequest) => Promise<SheetResponse>,
        rowStart: number,
        rowStop: number,
        colStart: number,
        colStop: number,
    ) {
        this.url = url;
        this.sheetName = sheetName;
        this.orientation = orientation;
        this.request = request;
        this.#rowStart = rowStart;
        this.#rowStop = rowStop;
        this.#colStart = colStart;
        this.#colStop = colStop;
    }

    static async fromUrl(url?: string, sheetName?: string, orientation: Orientation = 'normal'): Promise<SheetClient> {
        throw new Error('SheetClient.fromUrl() not yet implemented');
    }

    static fromSheet(
        sheet: SheetLike, 
        sheetName?: string, 
        orientation: Orientation = 'normal',
        rowStart?: number,
        rowStop?: number,
        colStart?: number,
        colStop?: number,
    ): SheetClient {
        const server = new SheetServer(sheet);
        return new SheetClient(
            undefined,
            sheetName,
            orientation,
            req => Promise.resolve(server.request(req)),
            rowStart ?? 1,
            rowStop ?? sheet.getLastRow() + 1,
            colStart ?? 1,
            colStop ?? sheet.getLastColumn() + 1,
        );
    }

    async get(columns: 'all' | 'none' | string[]): Promise<{ headers: Branch[], data: SheetResponse['data'] }> {
        return this.request({
            orientation: this.orientation,
            limit: { rowStart: this.rowStart, rowStop: this.rowStop, colStart: this.colStart, colStop: this.colStop },
            getHeaders: true,   // thus result.headers !== undefined (i.e., type cast below is ok)
            getData: 
                columns == 'all' ? true : 
                columns == 'none' ? false :
                { colHeaders: columns },
        }) as Promise<{ headers: Branch[], data: SheetResponse['data'] }>; 
    }

    async getRows(rowStart?: number, rowStop?: number): Promise<{ rows: Sendable[][], colNumbers: number[], rowOffset: number }> {
        const { data } = await this.request({
            orientation: this.orientation,
            limit: { rowStart: this.rowStart, rowStop: this.rowStop, colStart: this.colStart, colStop: this.colStop },
            getHeaders: false,
            getData: { rowStart, rowStop },
        });
        return data!;
    }

    async insertRows(rowIndex: number, numRows?: number): Promise<void> {
        await this.request({
            orientation: this.orientation,
            insertRows: {
                index: rowIndex,
                count: numRows,
            },
        });
    }

    async insertColumns(columnIndex: number, numColumns?: number): Promise<void> {
        await this.request({
            orientation: this.orientation,
            insertRows: {
                index: columnIndex,
                count: numColumns,
            },
        });
    }
}