namespace ClientTests {
    namespace Util {
        export function test(tester: Tester, fn: (sheetName: string) => Promise<void>) {
            google.script.run
                .withSuccessHandler(tester.wrapAsync(fn))
                .withFailureHandler(e => tester.error(String(e)))
                .makePetList();
        }
    }

    export function openTable(tester: Tester) {
        Util.test(tester, 
            async function(sheetName: string) {
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
        );
    }

    export function simpleWrite(tester: Tester) {
        Util.test(tester,
            async function(sheetName: string) {
                tester.log(sheetName);
                const tablePromise = Pet.Table.open({ id: docId, sheetName: sheetName });
                const table = await tablePromise;
                const r3 = table.getRow(3);
                tester.log(JSON.stringify(r3));
                tester.assertEq(r3, {species:"",name:"Billy",age:0});

                await table.fetchData(1, 6);
                const p = table.set('Billy', {age: 5});
                tester.log('set completed on client');
                await p;
                tester.log('set completed on server');


                tester.pass();
            }
        );
    }
}