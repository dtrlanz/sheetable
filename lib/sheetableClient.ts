
namespace Sheetable {
    export namespace Client {
        export function table<T extends Sheetable.MetaTagged>(Constructor: { new (): T }) {
            const meta = (new Constructor())[Sheetable.META];
            const indexKey = meta?.index;
            const indexLabel = indexKey ? meta?.props.get(indexKey)?.label : undefined;

            return class ClientTable extends Sheetable.Table<T> {
                private sheetInfo: Sheetable.SheetInfo;
                private colData: Sheetable.SheetColumns;
                private includeCols: number[];

                private constructor(data: Sheetable.SheetData) {
                    let maxColLen = 0;
                    for (const col of data.columns) {
                        if (col && col.length > maxColLen) maxColLen = col.length;
                    }
                    const dataRowStart = Sheetable.getMaxRow({ row: 1, children: data.headers }) + 1;
                    const headers = Sheetable.getHeaderTree(new Constructor(), data.headers, dataRowStart);
                    if (headers === undefined) throw new Error('failed to parse headers');
                    super(Constructor, headers, maxColLen + 1, dataRowStart);

                    this.sheetInfo = { url: data.url, sheetName: data.sheetName };
                    this.colData = data;
                    this.includeCols = [];
                    for (const c of this.headers.children) {
                        for (let i = c.colStart; i < c.colStop; i++) this.includeCols.push(i);
                    }

                    this.initIndex();
                }

                static open(sheet: SheetInfo, columnLabels?: string[]): Promise<ClientTable> {
                    let successHandler: (data: SheetData) => void = function () {};
                    let failureHandle: (e: any) => void;
                    const promise = new Promise<ClientTable>((res, rej) => {
                        successHandler = function(data: SheetData) {
                            const table = new ClientTable(data);
                            res(table);
                        };
                        failureHandle = function(e) { 
                            rej(e);
                        };
                    })

                    columnLabels ??= typeof indexLabel === 'string' ? [indexLabel] : [];
                    google.script.run
                        .withSuccessHandler(successHandler)
                        .withFailureHandler((e) => console.log('failed to open table: ' + String(e)))
                        .getSheetData(sheet, columnLabels, 1);

                    return promise;
                }

                readRow(row: number, checkState: CellCheck): any[] | undefined {
                    return this.colData.columns.map(col => col?.[row - this.colData.rowOffset]);
                };

                writeRow(row: number, vals: any[], checkState: CellCheck): void {
                    writeSheetRow(this.sheetInfo, row, vals, checkState);
                }

                fetchData(rowStart: number, rowStop?: number): Promise<void> {
                    let successHandler: (data: SheetColumns) => void = function () {};
                    let failureHandle: (e: any) => void;
                    const captureThis = this;
                    const promise = new Promise<void>((res, rej) => {
                        successHandler = function(data: SheetColumns) {
                            captureThis.colData = data;
                            rowStop ??= captureThis.dataRowStop;
                            for (let i = rowStart - captureThis.dataRowStart; i < rowStop - captureThis.dataRowStart; i++) {
                                delete captureThis.cache[i];
                            }
                            res();
                        };
                        failureHandle = function(e) { 
                            rej(e);
                        };
                    });
                    google.script.run
                        .withSuccessHandler(successHandler)
                        .withFailureHandler((e) => console.log('failed to open table: ' +String(e)))
                        .getSheetColumns(this.sheetInfo, this.includeCols, rowStart, rowStop);
                    
                    return promise;
                }
            };
        }
        
    }
}