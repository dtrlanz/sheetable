namespace ClientTests {
    function test(tester: Tester, includeKeys: 'index' | 'all' | string[], fn: (table: Sheetable.Table<Pet>) => Promise<void>) {
        google.script.run
            .withSuccessHandler(tester.wrapAsync(openTable))
            .withFailureHandler(e => tester.error(String(e)))
            .makePetList();

        async function openTable(sheetName: string) {
            tester.log('created ' + sheetName);
            const table = await Pet.Table.open({ id: docId, sheetName: sheetName }, includeKeys);
            await fn(table);
            tester.pass();
        }
    }

    export function loadIndexOnly(tester: Tester) {
        test(tester, 'index',
            async function(table: Sheetable.Table<Pet>) {
                const r3 = table.getRow(3);
                tester.log(JSON.stringify(r3));
                tester.assertEq(r3, {species:"",name:"Billy",age:0});

                await table.fetchData(1, 6);
                const r3b = table.getRow(3);
                tester.log(JSON.stringify(r3b));
                tester.assertEq(r3b, {species:"cat",name:"Billy",age:3});
            }
        );
    }

    export function loadAll(tester: Tester) {
        test(tester, 'all',
            async function(table: Sheetable.Table<Pet>) {
                const r3 = table.getRow(3);
                tester.log(JSON.stringify(r3));
                tester.assertEq(r3, {species:"cat",name:"Billy",age:3});

                await table.fetchData(1, 6);
                const r3b = table.getRow(3);
                tester.log(JSON.stringify(r3b));
                tester.assertEq(r3b, {species:"cat",name:"Billy",age:3});
            }
        );
    }

    export function loadSome(tester: Tester) {
        test(tester, ['species', 'name'],
            async function(table: Sheetable.Table<Pet>) {
                const r3 = table.getRow(3);
                tester.log(JSON.stringify(r3));
                tester.assertEq(r3, {species:"cat",name:"Billy",age:0});

                await table.fetchData(1, 6);
                const r3b = table.getRow(3);
                tester.log(JSON.stringify(r3b));
                tester.assertEq(r3b, {species:"cat",name:"Billy",age:3});
            }
        );
    }
}
