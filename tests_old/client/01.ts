namespace ClientTests {
    function test(tester: Tester, fn: (table: Sheetable.Table<Variable>) => Promise<void>) {
        google.script.run
            .withSuccessHandler(tester.wrapAsync(openTable))
            .withFailureHandler(e => tester.error(String(e)))
            .makeNumberList();

        async function openTable(sheetName: string) {
            tester.log('created ' + sheetName);
            const table = await Variable.Table.open({ id: docId, sheetName: sheetName });
            await fn(table);
            tester.pass();
        }
    }

    const EXPECTED = [undefined, undefined, 
        { real: 2, imag: 0 },
        { real: 3, imag: 0 },
        { real: 0, imag: -9 },
        undefined,
        { real: -29, imag: 0 }
    ];

    export function readScalars(tester: Tester) {
        test(tester, 
            async function(table: Sheetable.Table<Variable>) {
                await table.fetchData(1, 7);
                for (let row = 2; row < 7; row++) {
                    const entry = table.getRow(row);
                    
                    if (tester.assertEq(entry!.value, EXPECTED[row]))
                        tester.stringify(entry!.value);
                }
            }
        );
    }

    export function writeScalars(tester: Tester) {
        test(tester,
            async function(table: Sheetable.Table<Variable>) {
                await table.fetchData(1, 7);
                let entry = table.getRow(3);
                if (!entry) {
                    tester.error('failed to read row 3');
                    return;
                }
                let { value } = entry;
                if (!value) {
                    tester.error(`failed to read 'value' in row 3`);
                    return;
                }
                value.imag = 3.14;
                await table.set(entry);
                await table.fetchData(1, 6);
                entry = table.getRow(3);
                tester.assertEq(entry, { name: 'w', value: { real: 3, imag: 3.14 }});

                entry = table.getRow(4);
                if (!entry) {
                    tester.error('failed to read row 4');
                    return;
                }
                value = entry.value;
                if (!value) {
                    tester.error(`failed to read 'value' in row 4`);
                    return;
                }
                value.imag = 0;
                await table.set(entry);
                await table.fetchData(1, 6);
                entry = table.getRow(4);
                tester.assertEq(entry, { name: 'x', value: { real: 0, imag: 0 }});
            }
        );
    }

}

function makeNumberList(): string {
    const sheet = newSheet(`
        variable name  | value
        v | 2
        w | three
        x | { "real": 0, "imag": -9 }
        y |
        z | -29
    `);
    return sheet.getSheetName();
}
