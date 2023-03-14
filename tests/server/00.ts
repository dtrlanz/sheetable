namespace ServerTests {
        
    export function createTable(tester: ServerTester) {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const pets = Pet.Table.create(spreadsheet, [new Pet()]);
        tester.log('created table in ' + pets.sheet.getName());
        tester.assertEq(pets.index.size, 0);
    }

}
