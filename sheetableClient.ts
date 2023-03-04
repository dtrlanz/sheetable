function sheetableClient<T extends MetaTagged>(Constructor: { new (): T }) {
    return class TypedTable extends Table<T> {
        constructor(data: SheetData) {
            let headers: HeaderNode;
            const specimen = new Constructor();
            const r = getHeaderTree(specimen, data.headers, data.dataStartRow);
            if (!r) throw new Error('Error reading table headers.');
            headers = r;
            super(Constructor, sheet, headers);
        }
    };
}

