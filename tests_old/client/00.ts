namespace ClientTests {
    function test(tester: Tester, fn: (table: Sheetable.Table<Pet>) => Promise<void>) {
        google.script.run
            .withSuccessHandler(tester.wrapAsync(openTable))
            .withFailureHandler(e => tester.error(String(e)))
            .makePetList();

        async function openTable(sheetName: string) {
            tester.log('created ' + sheetName);
            const table = await Pet.Table.open({ id: docId, sheetName: sheetName });
            await fn(table);
            tester.pass();
        }
    }

    export function openTable(tester: Tester) {
        test(tester, 
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

    export function setAfterFetch(tester: Tester) {
        test(tester,
            async function(table: Sheetable.Table<Pet>) {
                await table.fetchData(1, 6);
                tester.log('fetched data');
                let val = table.getRow(3);
                tester.assertEq(val, {species:"cat",name:"Billy",age:3});

                const p = table.set('Billy', {age: 5});
                tester.log('set completed on client');
                val = table.getRow(3);
                tester.assertEq(val, {species:"cat",name:"Billy",age:5});

                await p;
                tester.log('set completed on server');
                await table.fetchData(1, 6);
                val = table.getRow(3);
                tester.assertEq(val, {species:"cat",name:"Billy",age:5});
            }
        );
    }

    export function setWithoutFetch(tester: Tester) {
        test(tester,
            async function(table: Sheetable.Table<Pet>) {
                let val = table.getRow(3);
                tester.assertEq(val, {species:"",name:"Billy",age:0});

                const p = table.set('Billy', {age: 5});
                tester.log('set completed on client');
                val = table.getRow(3);
                tester.assertEq(val, {species:"",name:"Billy",age:5});

                await p;
                tester.log('set completed on server');
                await table.fetchData(1, 6);
                val = table.getRow(3);
                tester.assertEq(val, {species:"cat",name:"Billy",age:5});
            }
        );
    }
}

function makePetList(): string {
    const sheet = newSheet(`
        Species  | Name   | Age
        dog      | Fluffy | 5
        cat      | Billy  | 3
        goldfish | Bob    | 1
        dog      | Karl   | 6
    `);
    return sheet.getSheetName();
}
