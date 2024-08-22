import { SheetLike, Orientation, Region, TableWalker } from "./sheet-navigation.js";
import { Branch } from "./headers.js";
import { Scalar, Sendable, fromSendable, toSendable } from "./values.js";
import { SpreadsheetServer, SpreadsheetRequest, SpreadsheetResponse } from "./server.js";

export class SpreadsheetClient {
    private url?: string;
    private id?: string;
    private name?: string;
    private sheetList?: { id: number, name: string }[];

    static serverFunctionName: string = 'processSpreadsheetRequest';

    constructor(urlOrId?: string) {
        if (urlOrId && urlOrId.includes('/')) {
            this.url = urlOrId;
        } else {
            this.id = urlOrId || undefined;
        }
    }

    private async request(request: SpreadsheetRequest): Promise<SpreadsheetResponse> {
        let resolve: (response: SpreadsheetResponse) => void;
        let reject: (error: Error) => void;
        const promise = new Promise<SpreadsheetResponse>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        google.script.run
            .withSuccessHandler((response: SpreadsheetResponse) => {
                this.url ??= response.spreadsheet?.url;
                this.id ??= response.spreadsheet?.id;
                this.name ??= response.spreadsheet?.name;
                if (response.spreadsheet?.sheets) {
                    this.sheetList = response.spreadsheet.sheets;
                }
                resolve(response);
            })
            .withFailureHandler(reject!)
            [SpreadsheetClient.serverFunctionName]({
                spreadsheetUrl: this.url,
                spreadsheetId: this.id,
                ...request
            });

        return promise;
    }

    getName(): string | undefined {
        return this.name;
    }

    getSheet(
        sheet?: string | { name?: string, id?: number },
        orientation: Orientation = 'normal',
    ): SheetClient {
        const { sheetName, sheetId } = getSheetArg(sheet);
        return new SheetClient(
            request => {
                return this.request({ sheetName, sheetId, orientation, ...request });
            },
            sheetName,
            sheetId,
            orientation,
        );
    }

    async getSheetByIndex(index: number, orientation: Orientation = 'normal') {
        // may need to request sheet list first
        if (!this.sheetList) await this.request({ listSheets: true });
        const sheetInfo = this.sheetList!.at(index);
        if (!sheetInfo) throw new Error(`Sheet with index ${index} not found.`);
        return this.getSheet(sheetInfo, orientation)
    }

    async getSheetList(): Promise<{ id: number, name: string }[]> {
        // update cached sheet list
        await this.request({ listSheets: true });
        // return cloned list
        return this.sheetList!.map(obj => ({ ...obj }));
    }

    async insertSheet(name?: string, index?: number): Promise<{ id: number, name: string, index: number }> {
        const { insertedSheet } = await this.request({
            sheetName: name,
            insertSheet: index ? { index } : true,
        });
        return insertedSheet!;
    }

    async deleteSheet(sheet: string | { name?: string, id: number }): Promise<void> {
        const { sheetName, sheetId } = getSheetArg(sheet);
        await this.request({
            sheetName, 
            sheetId,
            deleteSheet: true,
        });
    }
}

function getSheetArg(sheet?: string | { name?: string, id?: number }) {
    let sheetName: string | undefined;
    let sheetId: number | undefined;
    if (typeof sheet === 'string') {
        sheetName = sheet;
    } else if (sheet && (sheet.name || sheet.id != undefined)) {
        sheetName = sheet.name;
        sheetId = sheet.id;
    }
    return { sheetName, sheetId };
}

export type SheetEvent = 'structuralChange';

export type SheetEventParams<E extends SheetEvent> =
    E extends 'structuralChange' ? [
        change: 'deleted' | 'inserted', 
        dimension: 'rows' | 'columns', 
        position: number, 
        count: number] : 
    never;

type PendingRequest = {
    request: SpreadsheetRequest, 
    type: 'read' | 'write' | 'structural',
    resolve: (response: SpreadsheetResponse) => void,
    reject: (error: Error) => void,
};

export class SheetClient {
    readonly sheetName?: string;
    readonly sheetId?: number;
    readonly orientation: Orientation;
    private readonly request: (req: SpreadsheetRequest) => Promise<SpreadsheetResponse>;
    private requestsSent: PendingRequest[] = [];
    private requestsQueued: PendingRequest[] = [];
    private listeners: Map<SheetEvent, Set<Function>> = new Map();
    #rowStart: number;
    #rowStop?: number;
    #colStart: number;
    #colStop?: number;
    get rowStart() { return this.#rowStart; }
    get rowStop() { return this.#rowStop; }
    get colStart() { return this.#colStart; }
    get colStop() { return this.#colStop; }

    constructor(
        request: (req: SpreadsheetRequest) => Promise<SpreadsheetResponse>,
        sheetName?: string, 
        sheetId?: number,
        orientation: Orientation = 'normal', 
        rowStart: number = 1,
        rowStop?: number,
        colStart: number = 1,
        colStop?: number,
    ) {
        this.request = request;
        this.sheetName = sheetName;
        this.sheetId = sheetId;
        this.orientation = orientation;
        this.#rowStart = rowStart;
        this.#rowStop = rowStop;
        this.#colStart = colStart;
        this.#colStop = colStop;

        this.addEventListener('structuralChange', this.onStructuralChange.bind(this));
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
        const server = new SpreadsheetServer(sheet);
        return new SheetClient(
            req => new Promise(resolve => 
                // Defer promise resolution to the next tick of the event loop. This guarantees 
                // that a structural change requested immediately after another request does not
                // interefere with the earlier request. For example, if one request reads column C
                // and the next request deletes column C, all microtasks dependent on the first
                // response are completed before the deletion event fires.
                setTimeout(() => 
                    resolve(server.processRequest({ orientation, ...req }))
                )
            ),
            sheetName,
            undefined,
            orientation,
            rowStart,
            rowStop ?? sheet.getLastRow() + 1,
            colStart,
            colStop ?? sheet.getLastColumn() + 1,
        );
    }

    addEventListener<E extends SheetEvent>(event: E, listener: (...args: SheetEventParams<E>) => void) {
        const set = this.listeners.get(event);
        if (!set) {
            this.listeners.set(event, new Set([listener]));
        } else {
            set.add(listener);
        }
    }

    removeEventListener(event: SheetEvent, listener: (...args: any[]) => void) {
        this.listeners.get(event)?.delete(listener);
    }

    private async queueRequest(request: SpreadsheetRequest): Promise<SpreadsheetResponse> {
        // Classify request. Note that 'structural' requests may also include reads & writes, and
        // 'write' requests may also include reads.
        const type = 
            (request.deleteRows || request.deleteColumns 
                || request.insertRows || request.insertColumns) ? 'structural' 
            : request.writeData ? 'write' 
            : 'read';

        // Queue request and await response.
        let resolve: any, reject: any;
        const promise = new Promise<SpreadsheetResponse>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        this.requestsQueued.push({ request, type, resolve, reject });
        this.sendRequests();
        const response = await promise;

        // Fire appropriate events
        let listeners: Set<(...args: SheetEventParams<'structuralChange'>) => void> | undefined;
        const getListeners = () => this.listeners.get('structuralChange') as any;
        if (response.deletedRows) {
            listeners = getListeners();
            for (const del of Array.isArray(request.deleteRows)? request.deleteRows : [request.deleteRows!]) {
                if (!(del.stop > del.start)) continue;
                listeners?.forEach(l => l(
                    'deleted', 
                    'rows', 
                    del.start, 
                    del.stop - del.start,
                ));
            }
        }
        if (response.deletedColumns) {
            listeners ??= getListeners();
            for (const del of Array.isArray(request.deleteColumns)? request.deleteColumns : [request.deleteColumns!]) {
                if (!(del.stop > del.start)) continue;
                listeners?.forEach(l => l(
                    'deleted', 
                    'columns', 
                    del.start, 
                    del.stop - del.start,
                ));
            }
        }
        if (response.insertedRows) {
            listeners ??= getListeners();
            listeners?.forEach(l => l(
                'inserted', 
                'rows', 
                request.insertRows!.position, 
                request.insertRows!.count ?? 1,
            ));
        }
        if (response.insertedColumns) {
            listeners ??= getListeners();
            listeners?.forEach(l => l(
                'inserted', 
                'columns', 
                request.insertColumns!.position, 
                request.insertColumns!.count ?? 1,
            ));
        }

        return response;
    }

    private sendRequests() {
        if (!this.requestsQueued.length) return;

        if (this.requestsQueued[0].type === 'structural') {
            // Only send structural change requests if no other requests are en route. Otherwise 
            // changes in row/column numbers would interfere with read & write requests.
            if (this.requestsSent.length) return;

            const req = this.requestsQueued.shift()!;
            this.requestsSent.push(req);
            this.request(req.request)
            .then(req.resolve)
            .catch(req.reject)
            .finally(() => {
                const idx = this.requestsSent.findIndex(r => r === req);
                this.requestsSent.splice(idx, 1);
                this.sendRequests();
            });
        }

        while (this.requestsQueued[0]?.type === 'read' || this.requestsQueued[0]?.type === 'write') {
            // Only send read/write requests if no structural request are currently on route.
            if (this.requestsSent.find(req => req.type === 'structural')) return;

            const req = this.requestsQueued.shift()!;
            this.requestsSent.push(req);
            this.request(req.request)
            .then(req.resolve)
            .catch(req.reject)
            .finally(() => {
                const idx = this.requestsSent.findIndex(r => r === req);
                this.requestsSent.splice(idx, 1);
                this.sendRequests();
            });
        }
    }

    private onStructuralChange(
        change: 'deleted' | 'inserted', 
        dimension: 'rows' | 'columns', 
        position: number, 
        count: number,
    ) {
        // Note: This method makes frequent use of the fact that comparison operators > >= < <=
        // with undefined values evaluate to false. In these cases, the non-null assertion 
        // operator ! is not meant to signify that the value in question is never undefined, it 
        // merely tells the compiler that we know what we're doing.

        if (change === 'deleted' && dimension === 'rows') {
            // Update own boundaries to account for deleted rows.
            if (this.#rowStart > position)
                this.#rowStart -= Math.min(count, this.#rowStart - position);
            if (this.#rowStop! > position)
                this.#rowStop! -= Math.min(count, this.#rowStop! - position);
    
            // Update row numbers in queued requests to account for deleted rows.
            for (const { request } of this.requestsQueued) {
                if (request.limit?.rowStart! > position)
                    request.limit!.rowStart! -= Math.min(count, request.limit!.rowStart! - position);
                if (request.limit?.rowStop! > position)
                    request.limit!.rowStop! -= Math.min(count, request.limit!.rowStop! - position);
                if (request.deleteRows) {
                    for (const del of Array.isArray(request.deleteRows) ? request.deleteRows : [request.deleteRows]) {
                        if (del.start > position)
                            del.start -= Math.min(count, del.start - position);
                        if (del.stop! > position)
                            del.stop -= Math.min(count, del.stop - position);
                    }
                }
                if (request.insertRows?.position! > position)
                    request.insertRows!.position -= Math.min(count, request.insertRows!.position! - position);
                if (typeof request.readData === 'object') {
                    if (request.readData.rowStart! > position)
                        request.readData.rowStart! -= Math.min(count, request.readData.rowStart! - position);
                    if (request.readData.rowStop! > position)
                        request.readData.rowStop! -= Math.min(count, request.readData.rowStop! - position);
                }
                if (request.writeData) {
                    if (request.writeData.rowStart > position) {
                        const margin = request.writeData.rowStart - (position + count);
                        if (margin < 0) {
                            // remove data for deleted rows
                            request.writeData.rows.splice(0, -margin);
                        }
                        request.writeData.rowStart -= Math.min(count, request.writeData.rowStart - position);
                    } else if (request.writeData.rowStart + request.writeData.rows.length > position) {
                        // remove data for deleted rows
                        request.writeData.rows.splice(position - request.writeData.rowStart,
                            count);
                    }
                }
            }
            return;
        }

        if (change === 'inserted' && dimension === 'rows') {
            // Update own boundaries to account for inserted rows.
            if (this.#rowStart! > position)
                this.#rowStart! += count;
            if (this.#rowStop! >= position)
                this.#rowStop! += count;

            // Update row numbers in queued requests to account for inserted rows.
            for (const { request } of this.requestsQueued) {
                if (request.limit?.rowStart! >= position)
                    request.limit!.rowStart! += count;
                if (request.limit?.rowStop! > position)
                    request.limit!.rowStop! += count;
                if (request.deleteRows) {
                    if (!Array.isArray(request.deleteRows)) request.deleteRows = [request.deleteRows];
                    for (let i = 0; i < request.deleteRows.length; i++) {
                        const del = request.deleteRows[i];
                        if (del.start >= position) {
                            del.start += count;
                            del.stop += count;
                        } else if (del.stop > position) {
                            // Overlapping deletion should not affect newly inserted rows.
                            // Split range in two (before & after insertion).
                            const part2 = {
                                start: position + count,
                                stop: del.stop + count,
                            };
                            del.stop = position;
                            request.deleteRows.splice(++i, 0, part2);
                        }
                    }
                }
                if (request.insertRows?.position! >= position)
                    request.insertRows!.position += count;
                if (typeof request.readData === 'object' && request.readData.rowStart! >= position)
                    request.readData.rowStart! += count;
                if (typeof request.readData === 'object' && request.readData.rowStop! > position)
                    request.readData.rowStop! += count;
                if (request.writeData) {
                    if (request.writeData.rowStart >= position)
                        request.writeData.rowStart += count;
                    else if (request.writeData.rowStart + request.writeData.rows.length > position) {
                        // split data into two blocks, before and after inserted rows
                        request.writeData.rows.splice(position - request.writeData.rowStart,
                            0, ...Array(count));
                    }
                }
            }
            return;
        }
        
        if (change === 'deleted' && dimension === 'columns') {
            // Update own boundaries to account for deleted columns.
            if (this.#colStart > position)
                this.#colStart -= Math.min(count, this.#colStart - position);
            if (this.#colStop! > position)
                this.#colStop! -= Math.min(count, this.#colStop! - position);

            // Update column numbers in queued requests to account for deleted columns.
            for (const { request } of this.requestsQueued) {
                if (request.limit?.colStart! > position)
                    request.limit!.colStart! -= Math.min(count, request.limit!.colStart! - position);
                if (request.limit?.colStop! > position)
                    request.limit!.colStop! -= Math.min(count, request.limit!.colStop! - position);
                if (request.deleteColumns) {
                    for (const del of Array.isArray(request.deleteColumns) ? request.deleteColumns : [request.deleteColumns]) {
                        if (del.start > position)
                            del.start -= Math.min(count, del.start - position);
                        if (del.stop! > position)
                            del.stop -= Math.min(count, del.stop - position);
                    }
                }
                if (request.insertColumns?.position! > position)
                    request.insertColumns!.position -= Math.min(count, request.insertColumns!.position! - position);
                if (typeof request.readData === 'object' && request.readData.colNumbers) {
                    request.readData.colNumbers = request.readData.colNumbers.map(mapColumn)
                        .filter(col => col != undefined) as number[];
                }
                if (request.writeData) {
                    const width = request.writeData.rows.reduce((max, cur) => 
                        Math.max(max, cur?.length ?? 0), 0);
                    if (width !== 0) {
                        if (!request.writeData.colNumbers) {
                            const start = request.limit?.colStart ?? 1;
                            request.writeData.colNumbers = range(start, start + width);
                        }
                        const mappedColNumbers = request.writeData.colNumbers.map(mapColumn);
                        request.writeData.colNumbers = mappedColNumbers
                            .filter(col => col != undefined) as number[];

                        const deleteArr: number[] = [];
                        for (let i = mappedColNumbers.length - 1; i >= 0; i--) {
                            if (mappedColNumbers[i] == undefined) deleteArr.push(i);
                        }
                        for (const row of request.writeData.rows) {
                            if (!row) continue;
                            for (const idx of deleteArr) {
                                row.splice(idx, 1);
                            }
                        }
                    }
                }
            }
            return;

            function mapColumn(col: number) {
                return col < position ? col
                    : col >= position + count ? col - count
                    : undefined;
            }
        }
        
        if (change === 'inserted' && dimension === 'columns') {
            // Update own boundaries to account for inserted rows.
            if (this.#colStart! > position)
                this.#colStart! += count;
            if (this.#colStop! >= position)
                this.#colStop! += count;

            // Update column numbers in queued requests to account for inserted columns.
            for (const { request } of this.requestsQueued) {
                if (request.limit?.colStart! >= position)
                    request.limit!.colStart! += count;
                if (request.limit?.colStop! > position)
                    request.limit!.colStop! += count;
                if (request.deleteColumns) {
                    if (!Array.isArray(request.deleteColumns)) request.deleteColumns = [request.deleteColumns];
                    for (let i = 0; i < request.deleteColumns.length; i++) {
                        const del = request.deleteColumns[i];
                        if (del.start >= position) {
                            del.start += count;
                            del.stop += count;
                        } else if (del.stop > position) {
                            // Overlapping deletion should not affect newly inserted columns.
                            // Split range in two (before & after insertion).
                            const part2 = {
                                start: position + count,
                                stop: del.stop + count,
                            };
                            del.stop = position;
                            request.deleteColumns.splice(++i, 0, part2);
                        }
                    }
                }
                if (request.insertColumns?.position! >= position)
                    request.insertColumns!.position += count;
                if (typeof request.readData === 'object' && request.readData.colNumbers) {
                    request.readData.colNumbers = request.readData.colNumbers.map(mapColumn);
                }
                if (request.writeData) {
                    const width = request.writeData.rows.reduce((max, cur) => 
                        Math.max(max, cur?.length ?? 0), 0);
                    if (width !== 0) {
                        if (!request.writeData.colNumbers) {
                            const start = request.limit?.colStart ?? 1;
                            request.writeData.colNumbers = range(start, start + width);
                        }
                        request.writeData.colNumbers = request.writeData.colNumbers.map(mapColumn);
                    }
                }
            }
            return;

            function mapColumn(col: number) {
                return col < position ? col
                    : col + count;
            }
        }
    }

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
    async readTable(columns: 'all' | 'none' | string[]): Promise<{ headers: Branch[], data?: { rows: Scalar[][], colNumbers: number[], rowOffset: number } }> {
        const { headers, data } = await this.queueRequest({
            limit: { rowStart: this.rowStart, rowStop: this.rowStop, colStart: this.colStart, colStop: this.colStop },
            readHeaders: true,   // thus result.headers !== undefined (i.e., type cast below is ok)
            readData: 
                columns == 'all' ? true : 
                columns == 'none' ? false :
                { colHeaders: columns },
        });
        return {
            headers: headers!,
            data: data ? {
                rows: fromSendable(data.rows),
                colNumbers: data.colNumbers,
                rowOffset: data.rowOffset,
            } : undefined,
        };
    }

    /**
     * Returns values of the specified rows.
     * 
     * @param rowStart - the position (i.e., 1-based index) of the first row to be read
     * @param rowStop - the position of the row at which to stop, i.e., the row after the last row
     * to be included
     * @returns Promise<Scalar[][]> - 2-dimensional array of values
     */
    async readRows(rowStart?: number, rowStop?: number): Promise<Scalar[][]> {
        const { data } = await this.queueRequest({
            limit: { rowStart: this.rowStart, rowStop: this.rowStop, colStart: this.colStart, colStop: this.colStop },
            readHeaders: false,
            readData: { rowStart, rowStop },
        });
        if (!data || !data.colNumbers.length) throw new Error('server did not return any data');
        return fromSendable(data.rows);
    }

    async writeRows(rowStart: number, rows: (Scalar[] | undefined)[]): Promise<void> {
        const rowStop = this.rowStop ?? rowStart + rows.length;
        let colStop = this.colStop;
        if (!colStop) {
            const width = rows.reduce((max, cur) => Math.max(max, cur?.length ?? 0), 0);
            colStop = this.colStart + width;
        }
        await this.queueRequest({
            limit: { rowStart: this.rowStart, rowStop, colStart: this.colStart, colStop },
            writeData: { rowStart, rows: toSendable(rows) },            
        });
    }

    async insertRows(rowPosition: number, numRows?: number): Promise<void> {
        await this.queueRequest({
            insertRows: {
                position: rowPosition,
                count: numRows,
            },
        });
    }

    async insertColumns(columnPosition: number, numColumns?: number): Promise<void> {
        await this.queueRequest({
            insertColumns: {
                position: columnPosition,
                count: numColumns,
            },
        });
    }

    async deleteRows(rowPosition: number, numRows: number = 1): Promise<void> {
        await this.queueRequest({
            deleteRows: {
                start: rowPosition,
                stop: rowPosition + numRows,
            },
        });
    }

    async deleteColumns(columnPosition: number, numColumns: number = 1): Promise<void> {
        await this.queueRequest({
            deleteColumns: {
                start: columnPosition,
                stop: columnPosition + numColumns,
            },
        });
    }

    async extend(rowStop?: number, colStop?: number): Promise<void> {
        // No action is needed if either operand is undefined.
        if (rowStop! > this.#rowStop!) {
            await this.queueRequest({
                insertRows: {
                    position: this.#rowStop!,
                    count: rowStop! - this.#rowStop!,
                }
            });
            this.#rowStop = rowStop;
        }
        // No action is needed if either operand is undefined.
        if (colStop! > this.#colStop!) {
            await this.queueRequest({
                insertColumns: {
                    position: this.#colStop!,
                    count: colStop! - this.#colStop!,
                }
            });
            this.#colStop = colStop;
        }
    }
}

function range(start: number, stop: number) {
    const arr = [];
    for (let i = start; i < stop; i++) arr.push(i);
    return arr;
}
