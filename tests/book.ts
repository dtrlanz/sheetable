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

