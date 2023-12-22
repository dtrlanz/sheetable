// Make sure to add this module to the same directory
// `url` is a string containing the url of the spreadsheet to which the project is bound
import { url } from "./_url";

(globalThis as any).doGet = doGet;
function doGet() {
    const client = HtmlService.createTemplateFromFile('client');
    client.spreadsheet = {
        url: url,
    };
    return client.evaluate().setTitle('Client-side tests');
}
