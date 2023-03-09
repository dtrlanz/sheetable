
async function test03a() {
    const sheet = newSheet(`
        Species  | Name   | Age
        dog      | Fluffy | 5
        cat      | Billy  | 3
        goldfish | Bob    | 1
        dog      | Karl   | 6
    `);

    const PetTable = sheetableClient(Pet);
    const tablePromise = PetTable.open({ sheetName: sheet.getName() });
    const table = await tablePromise;

    const ui = SpreadsheetApp.getUi();
    const r3 = table.row(3);
    ui.alert(JSON.stringify(r3));
}

async function test03b() {
    const sheet = newSheet(`
        Species  | Name   | Age
        dog      | Fluffy | 5
        cat      | Billy  | 3
        goldfish | Bob    | 1
        dog      | Karl   | 6
    `);

    const PetTable = sheetableClient(Pet);
    const tablePromise = PetTable.open({ sheetName: sheet.getName() });
    const table = await tablePromise;

    const ui = SpreadsheetApp.getUi();
    const r3 = table.row(3);
    ui.alert(JSON.stringify(r3));

    await table.fetchData(1, 6);
    const r3b = table.row(3);
    ui.alert(JSON.stringify(r3b));

    sheet.getRange(3, 1).setValue('tiger');

    await table.fetchData(1, 6);
    const r3c = table.row(3);
    ui.alert(JSON.stringify(r3c));
}

async function test03c() {
    const sheet = newSheet(`
        Species  | Name   | Age
        dog      | Fluffy | 5
        cat      | Billy  | 3
        goldfish | Bob    | 1
        dog      | Karl   | 6
    `);

    const PetTable = sheetableClient(Pet);
    const tablePromise = PetTable.open({ sheetName: sheet.getName() });
    const table = await tablePromise;
    await table.fetchData(1, 6);

    const ui = SpreadsheetApp.getUi();
    const r3 = table.row(3);
    ui.alert(JSON.stringify(r3));

    table.set('Billy', { age: 4 });
    ui.alert(JSON.stringify(table.row(3)));
}