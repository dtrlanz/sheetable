namespace ServerTests {

    export function parseHeadersTransposed(tester: ServerTester) {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const { sheet } = Quiz.Table.create(spreadsheet);
        tester.log('created table in ' + sheet.getName());
        const table = Quiz.Table.open(sheet!);
        tester.log('loaded table from ' + sheet.getName());

        const expected = `
            <date>
            John <John>
            Beth <Beth>
            Salman <Salman>`;
            
        if (tester.assertEq(stringifyHeaders(table), getLines(expected).join('\n') + '\n'))
            tester.log('headers parsed correctly');        
    }

    export function readTransposed(tester: ServerTester) {
        const sheet = newSheet(`
                   | 21.1.2023 | 25.1.2023 | 14.2.2023
            John   |         8 |        10 |
            Beth   |         3 |           |        10
            Salman |         9 |         7 |        10
        `);
        const table = Quiz.Table.open(sheet);

        tester.assertEq(table.getRow(3), {
            date: '25.1.2023',
            John: 10,
            Beth: '',
            Salman: 7,
        });
    }

}