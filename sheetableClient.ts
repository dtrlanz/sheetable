function sheetableClient<T extends MetaTagged>(Constructor: { new (): T }) {
    const meta = (new Constructor())[META];
    const indexKey = meta?.index;
    const indexLabel = indexKey ? meta?.props.get(indexKey)?.label : undefined;

    return class TypedTable extends Table<T> {
        constructor(data: SheetData) {
            super(Constructor, data);
        }

        static getTable(sheet: SheetInfo, columnLabels?: string[]): Promise<TypedTable> {
            let successHandler: (data: SheetData) => void = function () {};
            let failureHandle: (e: any) => void;
            const promise = new Promise<TypedTable>((res, rej) => {
                successHandler = function(data: SheetData) {
                    const table = new Table(Constructor, data);
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
    };
}

