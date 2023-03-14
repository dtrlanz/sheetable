
namespace Sheetable {
    export namespace Client {
        export function table<T extends Sheetable.MetaTagged>(Constructor: { new (): T }) {
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

                static open(sheet: SheetInfo, includeKeys: 'index' | 'all' | string[] = 'index'): Promise<ClientTable> {
                    let successHandler: (data: SheetData) => void = function () {};
                    let failureHandle: (e: any) => void;
                    const promise = new Promise<ClientTable>((res, rej) => {
                        successHandler = function(data: SheetData) {
                            try {
                                const table = new ClientTable(data);
                                res(table);
                            } catch (e) {
                                rej(e);
                            }
                        };
                        failureHandle = function(e) { 
                            rej(e);
                        };
                    })

                    const meta = Constructor.prototype[Sheetable.META] as MetaTagged[typeof META];
                    let columnLabels: string[] | undefined;
                    function addLabel(arr: string[], label?: string | string[]) {
                        if (typeof label === 'string') {
                            arr.push(label)
                        } else if (label) {
                            columnLabels = [...arr, ...label];
                        }
                    }
                    if (Array.isArray(includeKeys)) {
                        columnLabels = [];
                        for (const k of includeKeys) {
                            const label = meta?.props.get(k)?.label;
                            addLabel(columnLabels, label);
                        }
                    } else if (includeKeys === 'index') {
                        const indexKey = meta?.index;
                        const label = indexKey ? meta?.props.get(indexKey)?.label : undefined;
                        addLabel(columnLabels = [], label);
                    }
                    sheet.orientation ??= meta?.orientation ?? 'normal';
                    google.script.run
                        .withSuccessHandler(successHandler)
                        .withFailureHandler((e) => console.log('failed to open table: ' + String(e)))
                        .getSheetData(sheet, 1, undefined, columnLabels);

                    return promise;
                }

                readRow(row: number, checkState: CellCheck): any[] | undefined {
                    return this.colData.columns.map(col => col?.[row - this.colData.rowOffset]);
                };

                writeRow(row: number, vals: any[], checkState: CellCheck): Promise<void> {
                    let successHandler: (data: SheetColumns) => void = function () {};
                    let failureHandle: (e: any) => void = successHandler;
                    const promise = new Promise<void>((res, rej) => {
                        successHandler = () => res();
                        failureHandle = (e) => rej(e);
                    });
                    google.script.run
                        .withSuccessHandler(successHandler)
                        .withFailureHandler(failureHandle)
                        .writeSheetRow(this.sheetInfo, row, vals);
                    return promise;
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