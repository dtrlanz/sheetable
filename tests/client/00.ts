namespace ClientTests {
    export function openTable(tester: Tester) {
        tester.log('running test00');

        google.script.run
            .withSuccessHandler(tester.wrapAsync(callback))
            .withFailureHandler(e => tester.error(String(e)))
            .makePetList();

        async function callback(sheetName: string) {
            tester.log(sheetName);
            const tablePromise = Pet.Table.open({ id: docId, sheetName: sheetName });
            const table = await tablePromise;
            const r3 = table.getRow(3);
            tester.log(JSON.stringify(r3));
            tester.assertEq(r3, {species:"",name:"Billy",age:0});

            await table.fetchData(1, 6);
            const r3b = table.getRow(3);
            tester.log(JSON.stringify(r3b));
            tester.assertEq(r3b, {species:"cat",name:"Billy",age:3});

            tester.pass();
        }
    }
}