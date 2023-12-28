// Test whether the class TestSheet behaves analagously to a Google Sheet for the relevant
// methods.

import { TestSheet } from "../util/sheet-navigation";
import { test } from "./test";
import { SF } from "./server-fns";
import { server as _server, TypedServer } from "./server-proxy";
import { SheetLike } from "../../src/sheet-navigation";

const server = _server as TypedServer<SF>;

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

    getValue(row: number, column: number): Promise<any> {
        return server.getValue(this._name, row, column);
    }

    getValues(row: number, column: number, numRows?: number, numColumns?: number): Promise<any[][]> {
        return server.getValues(this._name, row, column, numRows, numColumns);
    }

    insertColumns(columnIndex: number, numColumns?: number): Promise<void> {
        return server.insertColumns(this._name, columnIndex, numColumns);
    }

    async insertRows(rowIndex: number, numRows?: number): Promise<void> {
        return server.insertRows(this._name, rowIndex, numRows);
    }
}

test('read & write data', async t => {
    const tSheet = new TestSheet([]);
    const sSheet = await ServerSheet.create();

    // read single cell from an empty sheet
    t.deepEqual(tSheet.getRange(1, 1).getValue(), '', 'unexpected value from TestSheet');
    t.deepEqual(await sSheet.getValue(1, 1), '', 'unexpected value from server');

    t.deepEqual(tSheet.getRange(1, 1).getValues(), [['']], 'unexpected value from TestSheet');
    t.deepEqual(await sSheet.getValues(1, 1), [['']], 'unexpected value from server');

    t.deepEqual(tSheet.getRange(1, 1, 1, 1).getValues(), [['']], 'unexpected value from TestSheet');
    t.deepEqual(await sSheet.getValues(1, 1, 1, 1), [['']], 'unexpected value from server');

    await sSheet.delete();
});