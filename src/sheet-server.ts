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

export function writeSheetRow(info: Sheetable.SheetInfo, row: number, vals: Sheetable.Sendable[], checkState?: Sheetable.CellCheck) {
    const { sheet, orientation } = getSheet(info);
    const region = Sheetable.Region.fromSheet(sheet, orientation);
    region.writeRow(row, vals, 'encroach');

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
