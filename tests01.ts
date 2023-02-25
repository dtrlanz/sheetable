const PROPS_DEFS = {
    title: { label: 'Title' },
    isbn: { label: 'ISBN' },
    authors: { label: ['Author 1', 'Author 2', 'Author 3'] },
    date: { label: 'Date' },
    firstName: { label: 'First Name' },
    lastName: { label: 'Last Name' },
} as { [k: string]: {
    label: string | string[],
    init?: () => any,
}};

const PROPS = new Map(Object.entries(PROPS_DEFS));

const LABEL_TO_KEY: Map<string, string | [string, number]> = new Map();
for (const [k, v] of Object.entries(PROPS_DEFS)) {
    if (Array.isArray(v.label)) {
        for (let i = 0; i < v.label.length; i++) {
            LABEL_TO_KEY.set(v.label[i], [k, i]);
        }
    } else {
        LABEL_TO_KEY.set(v.label, k);
    }
}

const META_OBJ = {
    props: PROPS,
    labelToKey: LABEL_TO_KEY,
};

function headersToString(headers: HeaderNode, level: number): string {
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
        r += headersToString(c, level);
    }
    return r;
}

function headerKeysToString(headers: HeaderNode, level: number): string {
    let r = '';
    if ('key' in headers) {
        const k = Array.isArray(headers.key) ? `${headers.key[0]}[${headers.key[1]}]`
                                             : String(headers.key);
        r += '>>'.repeat(level) + k + '\n';
        level++;
    }
    for (const c of headers.children) {
        r += headerKeysToString(c, level);
    }
    return r;
}

class Book {
    get [META]() { return META_OBJ };

    title: string = '';
    isbn: string = '';
    authors: Person[] = [new Person(), new Person(), new Person()];
    date: Date = new Date();
}

class Person {
    get [META]() { return META_OBJ };

    firstName: string = '';
    lastName: string = '';
}

function test01a() {
    const BookTable = new Sheetable(Book, );
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const { sheet } = BookTable.create(spreadsheet);

    const ui = SpreadsheetApp.getUi();
    const headers = readHeaders(TableWalker.fromSheet(sheet), new Book(), ui);
    if (headers)
        ui.alert(headersToString(headers, 0));    
}

function test01b() {
    const ui = SpreadsheetApp.getUi();
    const sheet = newSheet(
`Title                | Author 1   |              | Date
                      | First Name | Last Name    | Year
To Kill A Mockingbird | Harper     | Lee          | 1960 | comment
Don Quixote           | Miguel     | de Cervantes | 1605
Jane Eyre             | Charlotte  | Brontë       | 1847
The Great Gatsby      | F. Scott   | Fitzgerald   | 1925
`
    );
    const headers = readHeaders(TableWalker.fromSheet(sheet), new Book(), ui);
    if (headers)
        ui.alert(headersToString(headers, 0));

}