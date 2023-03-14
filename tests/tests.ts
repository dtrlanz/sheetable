function onOpen() {
    SpreadsheetApp.getUi()
    .createMenu('Tests')
    .addItem('Client-side tests...', 'openClientTests')
    .addItem('Server-side tests...', 'openServerTests')
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
    for (const line of getLines(content)) {
        let col = 1;
        for (const val of line.split('|')) {
            sheet.getRange(row, col).setValue(val.trim());
            col++;
        }
        row++;
    }
    return sheet;
}

function getLines(str: string): string[] {
    let arr = [];
    for (const line of str.split('\n')) {
        const trimmed = line.trim();
        if (trimmed !== '') arr.push(trimmed);
    }
    return arr;
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

function openClientTests() {
    const sidebar = HtmlService.createTemplateFromFile('tests/testClient');
    sidebar.docId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const html = sidebar.evaluate().setTitle('Client-side tests');
    SpreadsheetApp.getUi().showSidebar(html);
}

function openServerTests() {
    const sidebar = HtmlService.createTemplateFromFile('tests/server/sidebar');
    sidebar.docId = SpreadsheetApp.getActiveSpreadsheet().getId();
    const html = sidebar.evaluate().setTitle('Server-side tests');
    SpreadsheetApp.getUi().showSidebar(html);
}

function doGet() {
    const sidebar = HtmlService.createTemplateFromFile('test');
    sidebar.docId = '' // SpreadsheetApp.getActiveSpreadsheet().getId();
    return sidebar.evaluate().setTitle('Test Sidebar');
}

function runServerTest(name: string) {
    const tester = new ServerTester();
    const test = (ServerTests as any)[name];
    if (typeof test !== 'function') {
        tester.error(`Test '${name}' not found`);
    } else try {
        test(tester);
        tester.pass();
    } catch(e) {
        tester.error(String(e));
    }
    return tester.data;
}

function getServerTestList(): string[] {
    const list = [];
    for (const k in ServerTests) {
        if (typeof (ServerTests as any)[k] === 'function') list.push(k);
    }
    return list;
}