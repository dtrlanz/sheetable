
function test02a() {
    const sheet = newSheet(`
        Species  | Name   | Age
        dog      | Fluffy | 5
        cat      | Billy  | 3
        goldfish | Bob    | 1
        dog      | Karl   | 6
    `);
    const table = new Pet.Table(sheet);

    const ui = SpreadsheetApp.getUi();
    const r3 = table.row(3);
    ui.alert(JSON.stringify(r3));
}

function test02b() {
    const sheet = newSheet(`
        Title                 | Author 1   |              | Date
                              | First Name | Last Name    | Year
        To Kill A Mockingbird | Harper     | Lee          | 1960
        Don Quixote           | Miguel     | de Cervantes | 1605
        Jane Eyre             | Charlotte  | Brontë       | 1847
        The Great Gatsby      | F. Scott   | Fitzgerald   | 1925
    `);
    const table = new Book.Table(sheet);

    const ui = SpreadsheetApp.getUi();
    const r4 = table.row(4);
    const r6 = table.row(6);
    ui.alert(JSON.stringify(r4));
    ui.alert(JSON.stringify(r6));
}

function test02c() {
    const sheet = newSheet(`
        Species  | Name   | Age
        dog      | Fluffy | 5
        cat      | Billy  | 3
        goldfish | Bob    | 1
        dog      | Karl   | 6
    `);
    const table = new Pet.Table(sheet);

    const ui = SpreadsheetApp.getUi();
    const fluffy = table.get('Fluffy');
    const billy = table.get('Billy');
    const bob = table.get('Bob');
    const karl = table.get('Karl');
    ui.alert(JSON.stringify(fluffy));
    ui.alert(JSON.stringify(billy));
    ui.alert(JSON.stringify(bob));
    ui.alert(JSON.stringify(karl));
}
