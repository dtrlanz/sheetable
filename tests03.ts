
async function test03a() {
    const sheet = newSheet(`
        Species  | Name   | Age
        dog      | Fluffy | 5
        cat      | Billy  | 3
        goldfish | Bob    | 1
        dog      | Karl   | 6
    `);

    const PetTable = sheetableClient(Pet);
    const tablePromise = PetTable.getTable({ sheetName: sheet.getName() });
    const table = await tablePromise;

    const ui = SpreadsheetApp.getUi();
    const r3 = table.row(3);
    ui.alert(JSON.stringify(r3));
    table.fetchData!(1, 6);
    const r3b = table.row(3);
    ui.alert(JSON.stringify(r3b));
}

