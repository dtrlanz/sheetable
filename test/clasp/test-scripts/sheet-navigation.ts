// Test whether the class TestSheet behaves analagously to a Google Sheet for the relevant
// methods.

import { TestSheet } from "../../util/sheet-navigation";
import { test } from "../test";
import { SF } from "../server-fns";
import { server as _server, TypedServer } from "../server-proxy";

const server = _server as TypedServer<SF>;

/**
 * Test utility class that wraps the corresponding server functions in a class similar to 
 * `SheetLike`. The primary difference is that methods have to return promises.
 */
class ServerSheet {
    _name: string;

    private constructor(name: string) {
        this._name = name;
    }

    static async create(): Promise<ServerSheet> {
        const name = await server.insertSheet();
        return new ServerSheet(name);
    }

    delete() {
        return server.deleteSheet(this._name);
    }

    getLastColumn(): Promise<number> {
        return server.getLastColumn(this._name);
    }

    getLastRow(): Promise<number> {
        return server.getLastRow(this._name);
    }

    getRange(row: number, column: number, numRows: number = 1, numColumns: number = 1) {
        const name = this._name;
        return {
            getValue(): Promise<any> {
                return server.getRangeValue(name, row, column);
            },
            getValues(): Promise<any[][]> {
                return server.getRangeValues(name, row, column, numRows, numColumns);
            },
            setValue(value: number | string | boolean | Date): Promise<void> {
                return server.setRangeValue(name, row, column, value);
            },
            setValues(values: (number | string | boolean | Date)[][]): Promise<void> {
                return server.setRangeValues(name, row, column, numRows, numColumns, values);
            },
        }
    }

    insertColumns(columnPosition: number, numColumns?: number): Promise<void> {
        return server.insertColumns(this._name, columnPosition, numColumns);
    }

    insertRows(rowPosition: number, numRows?: number): Promise<void> {
        return server.insertRows(this._name, rowPosition, numRows);
    }

    deleteColumns(columnPosition: number, numColumns?: number) {
        return server.deleteColumns(this._name, columnPosition, numColumns);
    }

    deleteRows(rowPosition: number, numRows?: number) {
        return server.deleteRows(this._name, rowPosition, numRows);
    }
}

test('empty sheet', async t => {
    const tSheet = new TestSheet([]);
    const sSheet = await ServerSheet.create();

    // number of rows & columns
    t.is(await sSheet.getLastRow(), 0, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 0, 'unexpected value from TestSheet');

    t.is(await sSheet.getLastColumn(), 0, 'unexpected value from server');
    t.is(tSheet.getLastColumn(), 0, 'unexpected value from TestSheet');

    // read single cell from an empty sheet
    t.is(await sSheet.getRange(1, 1).getValue(), '', 'unexpected value from server');
    t.is(tSheet.getRange(1, 1).getValue(), '', 'unexpected value from TestSheet');

    t.deepEqual(await sSheet.getRange(1, 1).getValues(), [['']], 'unexpected value from server');
    t.deepEqual(tSheet.getRange(1, 1).getValues(), [['']], 'unexpected value from TestSheet');

    t.deepEqual(await sSheet.getRange(1, 1, 1, 1).getValues(), [['']], 'unexpected value from server');
    t.deepEqual(tSheet.getRange(1, 1, 1, 1).getValues(), [['']], 'unexpected value from TestSheet');

    await sSheet.delete();
});

test('read & write data', async t => {
    const tSheet = new TestSheet([]);
    const sSheet = await ServerSheet.create();

    // write single value
    await sSheet.getRange(1, 1).setValue(5);
    tSheet.getRange(1, 1).setValue(5);

    t.is(await sSheet.getRange(1, 1).getValue(), 5, 'unexpected value from server');
    t.is(tSheet.getRange(1, 1).getValue(), 5, 'unexpected value from TestSheet');

    t.deepEqual(await sSheet.getRange(1, 1, 1, 2).getValues(), [[5, '']], 'unexpected value from server');
    t.deepEqual(tSheet.getRange(1, 1, 1, 2).getValues(), [[5, '']], 'unexpected value from TestSheet');

    // number of rows & columns
    t.is(await sSheet.getLastRow(), 1, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 1, 'unexpected value from TestSheet');

    t.is(await sSheet.getLastColumn(), 1, 'unexpected value from server');
    t.is(tSheet.getLastColumn(), 1, 'unexpected value from TestSheet');

    // write several values
    await sSheet.getRange(2, 1, 2, 4).setValues([
        [1, 2, 3, 4],
        [5, 6, 7, 8],
    ]);
    tSheet.getRange(2, 1, 2, 4).setValues([
        [1, 2, 3, 4],
        [5, 6, 7, 8],
    ]);

    t.is(await sSheet.getRange(3, 3).getValue(), 7, 'unexpected value from server');
    t.is(tSheet.getRange(3, 3).getValue(), 7, 'unexpected value from TestSheet');

    t.deepEqual(await sSheet.getRange(1, 1, 3, 4).getValues(), [
        [5, '', '', ''],
        [1, 2, 3, 4],
        [5, 6, 7, 8],
    ], 'unexpected value from server');
    t.deepEqual(tSheet.getRange(1, 1, 3, 4).getValues(), [
        [5, '', '', ''],
        [1, 2, 3, 4],
        [5, 6, 7, 8],
    ], 'unexpected value from TestSheet');

    // number of rows & columns
    t.is(await sSheet.getLastRow(), 3, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 3, 'unexpected value from TestSheet');

    t.is(await sSheet.getLastColumn(), 4, 'unexpected value from server');
    t.is(tSheet.getLastColumn(), 4, 'unexpected value from TestSheet');

    // writing empty string does not change number of rows & columns
    await sSheet.getRange(12, 15).setValue("");
    tSheet.getRange(12, 15).setValue("");

    t.is(await sSheet.getLastRow(), 3, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 3, 'unexpected value from TestSheet');

    t.is(await sSheet.getLastColumn(), 4, 'unexpected value from server');
    t.is(tSheet.getLastColumn(), 4, 'unexpected value from TestSheet');
    
    // writing 0 does change number of rows & columns
    await sSheet.getRange(12, 15).setValue(0);
    tSheet.getRange(12, 15).setValue(0);

    t.is(await sSheet.getLastRow(), 12, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 12, 'unexpected value from TestSheet');

    t.is(await sSheet.getLastColumn(), 15, 'unexpected value from server');
    t.is(tSheet.getLastColumn(), 15, 'unexpected value from TestSheet');

    // writing false does change number of rows & columns
    await sSheet.getRange(17, 19).setValue(false);
    tSheet.getRange(17, 19).setValue(false);

    t.is(await sSheet.getLastRow(), 17, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 17, 'unexpected value from TestSheet');

    t.is(await sSheet.getLastColumn(), 19, 'unexpected value from server');
    t.is(tSheet.getLastColumn(), 19, 'unexpected value from TestSheet');

    await sSheet.delete();
});

test('insert rows & columns', async t => {
    const tSheet = new TestSheet([]);
    const sSheet = await ServerSheet.create();

    // insert row
    await sSheet.insertRows(1);
    tSheet.insertRows(1);

    t.is(await sSheet.getLastRow(), 0, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 0, 'unexpected value from TestSheet');

    // insert column
    await sSheet.insertColumns(1);
    tSheet.insertColumns(1);

    t.is(await sSheet.getLastRow(), 0, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 0, 'unexpected value from TestSheet');

    // add marker value
    await sSheet.getRange(3, 5).setValue(true);
    tSheet.getRange(3, 5).setValue(true);

    // insert row
    await sSheet.insertRows(3);
    tSheet.insertRows(3);

    t.is(await sSheet.getRange(4, 5).getValue(), true, 'unexpected value from server');
    t.is(tSheet.getRange(4, 5).getValue(), true, 'unexpected value from TestSheet');

    // insert column
    await sSheet.insertColumns(5);
    tSheet.insertColumns(5);

    t.is(await sSheet.getRange(4, 6).getValue(), true, 'unexpected value from server');
    t.is(tSheet.getRange(4, 6).getValue(), true, 'unexpected value from TestSheet');

    // insert rows
    await sSheet.insertRows(3, 5);
    tSheet.insertRows(3, 5);

    t.is(await sSheet.getRange(9, 6).getValue(), true, 'unexpected value from server');
    t.is(tSheet.getRange(9, 6).getValue(), true, 'unexpected value from TestSheet');

    // insert columns
    await sSheet.insertColumns(3, 5);
    tSheet.insertColumns(3, 5);

    t.is(await sSheet.getRange(9, 11).getValue(), true, 'unexpected value from server');
    t.is(tSheet.getRange(9, 11).getValue(), true, 'unexpected value from TestSheet');

    await sSheet.delete();
});;

test('delete rows & columns', async t => {
    const tSheet = new TestSheet([]);
    const sSheet = await ServerSheet.create();

    // delete row
    await sSheet.deleteRows(1);
    tSheet.deleteRows(1);

    t.is(await sSheet.getLastRow(), 0, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 0, 'unexpected value from TestSheet');

    // delete column
    await sSheet.deleteColumns(1);
    tSheet.deleteColumns(1);

    t.is(await sSheet.getLastRow(), 0, 'unexpected value from server');
    t.is(tSheet.getLastRow(), 0, 'unexpected value from TestSheet');

    // add marker value
    await sSheet.getRange(10, 8).setValue(true);
    tSheet.getRange(10, 8).setValue(true);

    // delete row
    await sSheet.deleteRows(3);
    tSheet.deleteRows(3);

    t.is(await sSheet.getRange(9, 8).getValue(), true, 'unexpected value from server');
    t.is(tSheet.getRange(9, 8).getValue(), true, 'unexpected value from TestSheet');

    // delete column
    await sSheet.deleteColumns(3);
    tSheet.deleteColumns(3);

    t.is(await sSheet.getRange(9, 7).getValue(), true, 'unexpected value from server');
    t.is(tSheet.getRange(9, 7).getValue(), true, 'unexpected value from TestSheet');

    // delete rows
    await sSheet.deleteRows(3, 5);
    tSheet.deleteRows(3, 5);

    t.is(await sSheet.getRange(4, 7).getValue(), true, 'unexpected value from server');
    t.is(tSheet.getRange(4, 7).getValue(), true, 'unexpected value from TestSheet');

    // delete columns
    await sSheet.deleteColumns(3, 2);
    tSheet.deleteColumns(3, 2);

    t.is(await sSheet.getRange(4, 5).getValue(), true, 'unexpected value from server');
    t.is(tSheet.getRange(4, 5).getValue(), true, 'unexpected value from TestSheet');

    // delete rows
    await sSheet.deleteRows(4);
    tSheet.deleteRows(4);

    t.is(await sSheet.getRange(4, 7).getValue(), '', 'unexpected value from server');
    t.is(tSheet.getRange(4, 7).getValue(), '', 'unexpected value from TestSheet');

    await sSheet.delete();
});;