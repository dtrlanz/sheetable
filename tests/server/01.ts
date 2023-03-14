namespace ServerTests {

    export function parseHeaders0(tester: ServerTester) {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const { sheet } = Book.Table.create(spreadsheet);
        tester.log('created table in ' + sheet.getName());
        const table = Book.Table.open(sheet!);
        tester.log('loaded table from ' + sheet.getName());

        const expected = `
            Title <title>
            ISBN <isbn>
            Author 1 <authors[0]>
            --First Name <firstName>
            --Last Name <lastName>
            Author 2 <authors[1]>
            --First Name <firstName>
            --Last Name <lastName>
            Author 3 <authors[2]>
            --First Name <firstName>
            --Last Name <lastName>
            Date <date>`;
            
        if (tester.assertEq(stringifyHeaders(table), getLines(expected).join('\n') + '\n'))
            tester.log('headers parsed correctly');
    }
    
    export function parseHeaders1(tester: ServerTester) {
        const sheet = newSheet(`
            Title                 | Author 1   |              | Date
                                  | First Name | Last Name    | Year
            To Kill A Mockingbird | Harper     | Lee          | 1960 | comment
            Don Quixote           | Miguel     | de Cervantes | 1605
            Jane Eyre             | Charlotte  | Brontë       | 1847
            The Great Gatsby      | F. Scott   | Fitzgerald   | 1925
        `);
        
        tester.log('created ' + sheet.getName());
        const table = Book.Table.open(sheet);
        tester.log('loaded table from ' + sheet.getName());
        
        const expected = `
            Title <title>
            Author 1 <authors[0]>
            --First Name <firstName>
            --Last Name <lastName>
            Date <date>
            --Year <Year>`;

        if (tester.assertEq(stringifyHeaders(table), getLines(expected).join('\n') + '\n'))
            tester.log('headers parsed correctly');
    }    
}