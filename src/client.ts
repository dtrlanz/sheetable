import { SheetLike, Orientation, Region, TableWalker } from "./sheet-navigation.js";
import { Branch } from "./headers.js";
import { Sendable } from "./values.js";
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

    getSheet(
        sheet?: string | { name?: string, id?: number },
        orientation: Orientation = 'normal',
    ): SheetClient {
        const { sheetName, sheetId } = getSheetArg(sheet);
        return new SheetClient(
            request => this.request({ sheetName, sheetId, ...request }),
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

export class SheetClient {
    readonly sheetName?: string;
    readonly sheetId?: number;
    readonly orientation: Orientation;
    private readonly request: (req: SpreadsheetRequest) => Promise<SpreadsheetResponse>;
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
        this.sheetName = sheetName;
        this.sheetId = sheetId;
        this.orientation = orientation;
        this.request = request;
        this.#rowStart = rowStart;
        this.#rowStop = rowStop;
        this.#colStart = colStart;
        this.#colStop = colStop;
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
            req => Promise.resolve(server.processRequest(req)),
            sheetName,
            undefined,
            orientation,
            rowStart,
            rowStop ?? sheet.getLastRow() + 1,
            colStart,
            colStop ?? sheet.getLastColumn() + 1,
        );
    }

    async get(columns: 'all' | 'none' | string[]): Promise<{ headers: Branch[], data: SpreadsheetResponse['data'] }> {
        return this.request({
            orientation: this.orientation,
            limit: { rowStart: this.rowStart, rowStop: this.rowStop, colStart: this.colStart, colStop: this.colStop },
            getHeaders: true,   // thus result.headers !== undefined (i.e., type cast below is ok)
            getData: 
                columns == 'all' ? true : 
                columns == 'none' ? false :
                { colHeaders: columns },
        }) as Promise<{ headers: Branch[], data: SpreadsheetResponse['data'] }>; 
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

    async insertRows(rowPosition: number, numRows?: number): Promise<void> {
        await this.request({
            orientation: this.orientation,
            insertRows: {
                position: rowPosition,
                count: numRows,
            },
        });
    }

    async insertColumns(columnPosition: number, numColumns?: number): Promise<void> {
        await this.request({
            orientation: this.orientation,
            insertColumns: {
                position: columnPosition,
                count: numColumns,
            },
        });
    }

    async deleteRows(rowPosition: number, numRows?: number): Promise<void> {
        await this.request({
            orientation: this.orientation,
            deleteRows: {
                position: rowPosition,
                count: numRows,
            },
        });
    }

    async deleteColumns(columnPosition: number, numColumns?: number): Promise<void> {
        await this.request({
            orientation: this.orientation,
            deleteColumns: {
                position: columnPosition,
                count: numColumns,
            },
        });
    }
}