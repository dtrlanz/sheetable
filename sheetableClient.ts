function sheetableClient<T extends MetaTagged>(Constructor: { new (): T }) {
    const meta = (new Constructor())[META];
    const indexKey = meta?.index;
    const indexLabel = indexKey ? meta?.props.get(indexKey)?.label : undefined;

    return class ClientTable extends Table<T> {
        private sheetInfo: SheetInfo;
        private colData: SheetColumns;
        private includeCols: number[];

        private constructor(data: SheetData) {
            let maxColLen = 0;
            for (const col of data.columns) {
                if (col && col.length > maxColLen) maxColLen = col.length;
            }
            const dataRowStart = getMaxRow({ row: 1, children: data.headers }) + 1;
            const headers = getHeaderTree(new Constructor(), data.headers, dataRowStart);
            if (headers === undefined) throw new Error('failed to parse headers');
            super(Constructor, headers, maxColLen + 1, dataRowStart);

            this.sheetInfo = data;
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
            const data = getSheetData(sheet, columnLabels, 1);
            successHandler(data);

            return promise;
        }

        readRow(row: number): any[] | undefined {
            return this.colData.columns.map(col => col[row - this.colData.rowOffset]);
        };

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
            const data = getSheetColumns(this.sheetInfo, this.includeCols, rowStart, rowStop);
            successHandler(data);
            return promise;
        }
    };
}
