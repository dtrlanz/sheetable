import { ServerFunctions } from "./server-proxy";
import { url } from "./_url";

export interface SF extends ServerFunctions {
    add(lhs: number, rhs: number): number;
    subtract(lhs: number, rhs: number): number;
}

(globalThis as any).add = add;
export function add(lhs: number, rhs: number) {
    return lhs + rhs;
}

(globalThis as any).subtract = subtract;
export function subtract(lhs: number, rhs: number) {
    return lhs - rhs;
}

// Server functions for testing TestSheet class

export interface SF extends ServerFunctions {
    insertSheet(): string;
    deleteSheet(name: string): void;
    getLastColumn(sheetName: string): number;
    getLastRow(sheetName: string): number;
    getValue(sheetName: string, row: number, column: number): any;
    getValues(sheetName: string, row: number, column: number, numRows?: number, numColumns?: number): any[][];
    insertColumns(sheetName: string, columnIndex: number, numColumns?: number): void;
    insertRows(sheetName: string, rowIndex: number, numRows?: number): void;
}

(globalThis as any).insertSheet = insertSheet;
export function insertSheet(): string {
    return SpreadsheetApp.openByUrl(url).insertSheet().getName();
}

(globalThis as any).deleteSheet = deleteSheet;
export function deleteSheet(name: string) {
    const spreadsheet = SpreadsheetApp.openByUrl(url);
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error(`sheet ${name} not found`);
    spreadsheet.deleteSheet(sheet);
}

(globalThis as any).getLastColumn = getLastColumn;
export function getLastColumn(sheetName: string): number {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${name} not found`);
    return sheet.getLastColumn();
}

(globalThis as any).getLastRow = getLastRow;
export function getLastRow(sheetName: string): number {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    return sheet.getLastRow();
}

(globalThis as any).getValue = getValue;
export function getValue(sheetName: string, row: number, column: number): any[][] {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    return sheet.getRange(row, column).getValue();
}

(globalThis as any).getValues = getValues;
export function getValues(sheetName: string, row: number, column: number, numRows?: number, numColumns?: number): any[][] {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    return sheet.getRange(row, column, numRows ?? 1, numColumns ?? 1).getValues();
}

(globalThis as any).insertColumns = insertColumns;
export function insertColumns(sheetName: string, columnIndex: number, numColumns?: number) {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    sheet.insertColumns(columnIndex, numColumns as any ?? undefined);
}

(globalThis as any).insertRows = insertRows;
export function insertRows(sheetName: string, rowIndex: number, numRows?: number) {
    const sheet = SpreadsheetApp.openByUrl(url).getSheetByName(sheetName);
    if (!sheet) throw new Error(`sheet ${sheetName} not found`);
    sheet.insertRows(rowIndex, numRows as any ?? undefined);
}
