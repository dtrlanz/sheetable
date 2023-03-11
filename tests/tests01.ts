class Book {
    static Table = Sheetable.table(Book);

    @Sheetable.label('Title')
    title: string = '';

    @Sheetable.label('ISBN')
    isbn: string = '';
    
    @Sheetable.label(['Author 1', 'Author 2', 'Author 3'])
    authors: Person[] = [new Person(), new Person(), new Person()];
    
    @Sheetable.label('Date')
    date: Date = new Date();
}

class Person {    
    @Sheetable.label('First Name')
    firstName: string = '';
    
    @Sheetable.label('Last Name')
    lastName: string = '';
}

function test01a() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const { sheet } = Book.Table.create(spreadsheet);

    const ui = SpreadsheetApp.getUi();
    const table = Book.Table.open(sheet!);
    ui.alert(stringifyHeaders(table));
}

function test01b() {
    const ui = SpreadsheetApp.getUi();
    const sheet = newSheet(`
        Title                 | Author 1   |              | Date
                              | First Name | Last Name    | Year
        To Kill A Mockingbird | Harper     | Lee          | 1960 | comment
        Don Quixote           | Miguel     | de Cervantes | 1605
        Jane Eyre             | Charlotte  | Brontë       | 1847
        The Great Gatsby      | F. Scott   | Fitzgerald   | 1925
    `);
    const table = Book.Table.open(sheet);
    ui.alert(stringifyHeaders(table));
}