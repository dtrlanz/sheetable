import { ServerFunctions } from "./server-proxy";
import { url } from "./_url";

export interface SF extends ServerFunctions {
    add(lhs: number, rhs: number): number;
    subtract(lhs: number, rhs: number): number;
}

(globalThis as any).add = add;
function add(lhs: number, rhs: number) {
    return lhs + rhs;
}

(globalThis as any).subtract = subtract;
function subtract(lhs: number, rhs: number) {
    return lhs - rhs;
}

// Server functions for testing TestSheet class

export interface SF extends ServerFunctions {
    insertSheet(): string;
    deleteSheet(name: string): void;
    getLastColumn(sheetName: string): number;
    getLastRow(sheetName: string): number;
    getRangeValue(sheetName: string, row: number, column: number): any;
    getRangeValues(sheetName: string, row: number, column: number, numRows?: number, numColumns?: number): any[][];
    setRangeValue(sheetName: string, row: number, column: number, value: any): void;
    setRangeValues(sheetName: string, row: number, column: number, numRows: number, numColumns: number, values: any[][]): void;
    insertColumns(sheetName: string, columnIndex: number, numColumns?: number): void;
    insertRows(sheetName: string, rowIndex: number, numRows?: number): void;
}

(globalThis as any).insertSheet = insertSheet;
function insertSheet(): string {
    return SpreadsheetApp.openByUrl(url).insertSheet().getName();
}

(globalThis as any).deleteSheet = deleteSheet;
function deleteSheet(name: string) {
    const spreadsheet = SpreadsheetApp.openByUrl(url);
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error(`sheet ${name} not found`);
    spreadsheet.deleteSheet(sheet);
}

(globalThis as any).getLastColumn = getLastColumn;
function getLastColumn(sheetName: string): number {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${name} not found`);
    return sheet.getLastColumn();
}

(globalThis as any).getLastRow = getLastRow;
function getLastRow(sheetName: string): number {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    return sheet.getLastRow();
}

(globalThis as any).getRangeValue = getRangeValue;
function getRangeValue(sheetName: string, row: number, column: number): any[][] {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    return sheet.getRange(row, column).getValue();
}

(globalThis as any).getRangeValues = getRangeValues;
function getRangeValues(sheetName: string, row: number, column: number, numRows?: number, numColumns?: number): any[][] {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    return sheet.getRange(row, column, numRows ?? 1, numColumns ?? 1).getValues();
}

(globalThis as any).setRangeValue = setRangeValue;
function setRangeValue(sheetName: string, row: number, column: number, value: any) {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    sheet.getRange(row, column).setValue(value);
}

(globalThis as any).setRangeValues = setRangeValues;
function setRangeValues(sheetName: string, row: number, column: number, numRows: number, numColumns: number, values: any[][]) {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    sheet.getRange(row, column, numRows ?? 1, numColumns ?? 1).setValues(values);
}

(globalThis as any).insertColumns = insertColumns;
function insertColumns(sheetName: string, columnIndex: number, numColumns?: number) {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    sheet.insertColumns(columnIndex, numColumns as any ?? undefined);
}

(globalThis as any).insertRows = insertRows;
function insertRows(sheetName: string, rowIndex: number, numRows?: number) {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    sheet.insertRows(rowIndex, numRows as any ?? undefined);
}

// Server functions for testing data types

export interface SF extends ServerFunctions { 
    testSendingTypes(): any[];
    testWritingTypes(): any[];
}

(globalThis as any).testWritingTypes = testWritingTypes;
function testWritingTypes(): any[] {
    const spreadsheet = SpreadsheetApp.openByUrl(url);
    const sheet = spreadsheet.insertSheet();

    const mySymbol = Symbol('my symbol');
    const myBigInt = BigInt(Number.MAX_SAFE_INTEGER);
    const myDate = new Date(0);
    const myObj = {};

    sheet.getRange(1, 1, 1, 8).setValues([
        [true, null, undefined, 53, myBigInt, 'abc', mySymbol, myObj]
    ]);
    const values = sheet.getRange(1, 1, 1, 8).getValues();

    spreadsheet.deleteSheet(sheet);
    return values;
}