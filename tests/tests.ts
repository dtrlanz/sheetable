function onOpen() {
    SpreadsheetApp.getUi()
    .createMenu('Tests')
    .addItem('Open sidebar', 'testSidebar')
    .addItem('Test 0a', 'test00a')
    .addItem('Test 1a', 'test01a')
    .addItem('Test 1b', 'test01b')
    // .addItem('Test 2a', 'test02a')
    // .addItem('Test 2b', 'test02b')
    // .addItem('Test 2c', 'test02c')
    // .addItem('Test 2d', 'test02d')
    // .addItem('Test 2e', 'test02e')
    // .addItem('Test 3a', 'test03a')
    // .addItem('Test 3b', 'test03b')
    // .addItem('Test 3c', 'test03c')
    .addItem('Test requireLib', 'testRequireLib')
    .addItem('Delete other sheets', 'delSheets')
    .addToUi();
}

function testRequireLib() {
    SpreadsheetApp.getUi().alert(requireLib(['sheetable']));
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

function stringifyHeaders<T extends Sheetable.MetaTagged>(table: Sheetable.Table<T>): string {
    return stringify(table.headers);

    function stringify(headers: Sheetable.HeaderNode, level: number = 0): string {
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

function testSidebar() {
    const sidebar = HtmlService.createTemplateFromFile('tests/testClient');
    sidebar.docId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const html = sidebar.evaluate().setTitle('Test Sidebar');
    SpreadsheetApp.getUi().showSidebar(html);
}

function doGet() {
    const sidebar = HtmlService.createTemplateFromFile('test');
    sidebar.docId = '' // SpreadsheetApp.getActiveSpreadsheet().getId();
    return sidebar.evaluate().setTitle('Test Sidebar');
}