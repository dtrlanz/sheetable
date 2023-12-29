import { SheetLike, Orientation, Region, TableWalker } from "./sheet-navigation.js";
import { Branch } from "./headers.js";
import { Sendable } from "./values.js";
import { SpreadsheetServer, SpreadsheetRequest, SpreadsheetResponse } from "./server.js";

export class SheetClient {
    readonly url?: string;
    readonly sheetName?: string;
    readonly orientation: Orientation;
    private readonly request: (req: SpreadsheetRequest) => Promise<SpreadsheetResponse>;
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
        request: (req: SpreadsheetRequest) => Promise<SpreadsheetResponse>,
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
        const server = new SpreadsheetServer(sheet);
        return new SheetClient(
            undefined,
            sheetName,
            orientation,
            req => Promise.resolve(server.do(req)),
            rowStart ?? 1,
            rowStop ?? sheet.getLastRow() + 1,
            colStart ?? 1,
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