import { test } from "../test";
import { SpreadsheetClient } from "../../../src/client";
import { url } from "../_url";

const client = new SpreadsheetClient(url);

test('create and delete sheets', async t => {
    const numSheets = (await client.getSheetList()).length;

    // create sheets
    const created = await Promise.all([0, 1, 2].map(_ => {
        return client.insertSheet();
    }));

    // confirm creation
    let list = await client.getSheetList();
    for (let i = 0; i < created.length; i++) {
        // only compare id and name
        // (index might have been changed through creation of subsequent sheets)
        const sheet = list.find(s => s.id === created[i].id);
        t.is(sheet?.name, created[i].name);
    }

    // delete sheets
    for (const sheet of created) {
        await client.deleteSheet(sheet);
    }

    // confirm deletion
    list = await client.getSheetList();
    for (const sheet of created) {
        t.is(list.findIndex(s => s.id === sheet.id), -1);
    }
})

test('convert dates when sending & receiving data', async t => {
    const sheet = client.getSheet(await client.insertSheet());

    await sheet.writeRows(1, [
        ['New Year', new Date(2024, 0, 1)],
        ['Labour Day', new Date(2024, 4, 1)],
    ]);

    const rows = (await sheet.readRows(1, 3));
    t.assert(rows[0][1] instanceof Date);
    t.assert(rows[1][1] instanceof Date);
    t.deepEqual(rows, [
        ['New Year', new Date(2024, 0, 1)],
        ['Labour Day', new Date(2024, 4, 1)],
    ]);

    await client.deleteSheet(sheet.sheetName!);
})

