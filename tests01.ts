class Book {
    static Table = sheetable(Book);

    @label('Title')
    title: string = '';

    @label('ISBN')
    isbn: string = '';
    
    @label(['Author 1', 'Author 2', 'Author 3'])
    authors: Person[] = [new Person(), new Person(), new Person()];
    
    @label('Date')
    date: Date = new Date();
}

class Person {    
    @label('First Name')
    firstName: string = '';
    
    @label('Last Name')
    lastName: string = '';
}

function test01a() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const { sheet } = new Book.Table(spreadsheet);

    const ui = SpreadsheetApp.getUi();
    const table = new Book.Table(sheet);
    ui.alert(stringifyHeaders(table));

    return 'cool';
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
    const table = new Book.Table(sheet);
    ui.alert(stringifyHeaders(table));
}