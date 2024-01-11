// Make sure to add this module to the same directory
// `url` is a string containing the url of the spreadsheet to which the project is bound
import { url } from "./_url";
import { SpreadsheetRequest, SpreadsheetResponse, SpreadsheetServer } from "../../lib/server";
import "./server-fns";

(globalThis as any).doGet = doGet;
function doGet() {
    const client = HtmlService.createTemplateFromFile('client');
    client.spreadsheet = {
        url: url,
    };
    return client.evaluate().setTitle('Tests');
}

const spreadsheet = SpreadsheetApp.openByUrl(url);

(globalThis as any).processSpreadsheetRequest = processSpreadsheetRequest;
function processSpreadsheetRequest(req: SpreadsheetRequest): SpreadsheetResponse {
    return new SpreadsheetServer(spreadsheet).processRequest(req);
}