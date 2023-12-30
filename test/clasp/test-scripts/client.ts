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
    t.is(list.length, numSheets + 3);
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
    t.is(list.length, numSheets);
    for (const sheet of created) {
        t.is(list.findIndex(s => s.id === sheet.id), -1);
    }
})
