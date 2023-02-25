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
        let col = 1;
        for (const val of line.split('|')) {
            sheet.getRange(row, col).setValue(val.trim());
            col++;
        }
        row++;
    }
    return sheet;
}