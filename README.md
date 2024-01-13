**Sheetable**

*A utility for reading & writing tables in spreadsheets using Google Apps Script*

---

## Install

```
npm install @dtrlanz/sheetable
```
 
## Usage

The following examples assume you are building your project with a bundler that allows you to import modules (e.g., [`@dtrlanz/gas-bundler`](https://github.com/dtrlanz/gas-bundler)).

For an example setup, see the [server-side code](./tests/clasp/app/server.ts), [client-side HTML](./tests/clasp/app/client.html), and [build script](./tests/clasp/app/build.js) of the included test app.

### Server-side code

Import `SpreadsheetServer` and add the following top-level function to your code:

```
import { SpreadsheetServer } from "@dtrlanz/sheetable";

function processSpreadsheetRequest(req) {
    return new SpreadsheetServer().processRequest(req);
}
```

If you want to limit client access to a specific spreadsheet, pass that to the `SpreadsheetServer` constructor:

```
const spreadsheet = SpreadsheetApp.openByUrl(/* spreadsheet url */);

function processSpreadsheetRequest(req) {
    return new SpreadsheetServer(spreadsheet).processRequest(req);
}
```

**Note:** As always, if you are using a bundler that performs tree-shaking, you will need to ensure your top-level functions are not eliminated. You can do this by assigning to `globalThis`:

```
globalThis.processSpreadsheetRequest = processSpreadsheetRequest;
```

### Client-side code

Import `Table` and create a class that defines the records in your table. You can then create new table using `Table.create()` or open a table from an existing spreadsheet using `Table.open()`.

```
import { Table } from "@dtrlanz/sheetable";

class Person {
    firstName = "";
    lastName = "";
    dob = new Date(0);
}

const people = Table.create(Person);
```

For further customization, you will probably want to import some decorators as well:

```
import { Table, title, index } from "@dtrlanz/sheetable";

class Person {
    @index
    @title("ID")
    id = 0;

    @title("First name")
    firstName = "";

    @title("Last name")
    lastName = "";

    @title("Date of birth")
    dob = new Date(0);
}

const people = Table.create(Person);
```

## Attribution & Disclaimer

Google and Google Sheets are trademarks of Google LLC. This project is not endorsed by or affiliated with Google in any way.

## License

**Sheetable** is released under the [MIT](./LICENSE) license.