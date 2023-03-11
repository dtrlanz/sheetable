
function test00a() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const pets = Pet.Table.create(spreadsheet, [new Pet()]);
}
