function onOpen() {
    SpreadsheetApp.getUi()
    .createMenu('Tests')
    .addItem('Test 0a', 'test00a')
    .addItem('Test 1a', 'test01a')
    .addItem('Test 1b', 'test01b')
    .addItem('Delete other sheets', 'delSheets')
    .addToUi();
}

function delSheets() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const active = spreadsheet.getActiveSheet().getSheetId();
    for (const sheet of spreadsheet.getSheets()) {
        if (sheet.getSheetId() !== active) {
            spreadsheet.deleteSheet(sheet);
        }
    }
}

function newSheet(content: string = '') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
    let row = 1;
    for (const line of content.split('\n')) {
        if (line.trim() === '') continue;
        let col = 1;
        for (const val of line.trim().split('|')) {
            sheet.getRange(row, col).setValue(val.trim());
            col++;
        }
        row++;
    }
    return sheet;
}

function stringifyHeaders(table: Table): string {
    return stringify((table as any).headers);

    function stringify(headers: HeaderNode, level: number = 0): string {
        let r = '';
        if ('label' in headers || 'key' in headers) {
            r += '--'.repeat(level);
            if ('label' in headers && headers.label) {
                r += headers.label + ' ';
            }
            if ('key' in headers && headers.key) {
                const k = Array.isArray(headers.key) ? `${headers.key[0]}[${headers.key[1]}]`
                                                     : String(headers.key);
                r += '<' + k + '>';
            }
            r += '\n';
            level++;
        }
        for (const c of headers.children) {
            r += stringify(c, level);
        }
        return r;
    }
}

