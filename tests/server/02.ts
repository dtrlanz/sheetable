namespace ServerTests {

    export function getByRowNumber0(tester: ServerTester) {
        const sheet = newSheet(`
            Species  | Name   | Age
            dog      | Fluffy | 5
            cat      | Billy  | 3
            goldfish | Bob    | 1
            dog      | Karl   | 6
        `);
        const table = Pet.Table.open(sheet);

        tester.assertEq(table.getRow(3), {
            species: 'cat',
            name: 'Billy',
            age: 3,
        });
    }

    export function getByRowNumber1(tester: ServerTester) {
        const sheet = newSheet(`
            Title                 | Author 1   |              | Date
                                  | First Name | Last Name    | Year
            To Kill A Mockingbird | Harper     | Lee          | 1960
            Don Quixote           | Miguel     | de Cervantes | 1605
            Jane Eyre             | Charlotte  | Brontë       | 1847
            The Great Gatsby      | F. Scott   | Fitzgerald   | 1925
        `);
        const table = Book.Table.open(sheet);

        tester.assertEq(table.getRow(4), {
            title: 'Don Quixote',
            authors: [{
                firstName: 'Miguel',
                lastName: 'de Cervantes',
            }],
            date: new Date('1605'),
        });
        tester.assertEq(table.getRow(6), {
            title: 'Jane Eyre',
            authors: [{
                firstName: 'Charlotte',
                lastName: 'Brontë',
            }],
            date: new Date('1847'),
        });
    }

    export function getSet0(tester: ServerTester) {
        const sheet = newSheet(`
            Species  | Name   | Age
            dog      | Fluffy | 5
            cat      | Billy  | 3
            goldfish | Bob    | 1
            dog      | Karl   | 6
        `);
        const table = Pet.Table.open(sheet);

        tester.assertEq(table.get('Fluffy'), {
            species: 'dog',
            name: 'Fluffy',
            age: 5,
        });
        tester.assertEq(table.get('Billy'), {
            species: 'cat',
            name: 'Billy',
            age: 3,
        });
        tester.assertEq(table.get('Bob'), {
            species: 'goldfish',
            name: 'Bob',
            age: 1,
        });
        const karl = table.get('Karl');
        tester.assertEq(karl, {
            species: 'dog',
            name: 'Karl',
            age: 6,
        });

        // manually change Karl's age to 7
        sheet.getRange(5, 3).setValue(7);
        // retrieve cached record (will not reflect change)
        tester.assertEq(table.get('Karl'), {
            species: 'dog',
            name: 'Karl',
            age: 6,
        });
        // force refresh (record will now reflect change)
        tester.assertEq(table.get('Karl', true), {
            species: 'dog',
            name: 'Karl',
            age: 7,
        });
        tester.assertEq(table.get(karl!), {
            species: 'dog',
            name: 'Karl',
            age: 7,
        });
    }

    export function getSet1(tester: ServerTester) {
        const sheet = newSheet(`
            Species  | Name   | Age
            dog      | Fluffy | 5
            cat      | Billy  | 3
            goldfish | Bob    | 1
            dog      | Karl   | 6
        `);
        const table = Pet.Table.open(sheet);

        const fluffy = table.get('Fluffy')!;
        tester.assertEq(fluffy, {
            species: 'dog',
            name: 'Fluffy',
            age: 5,
        });
        fluffy.age = 6;
        table.set(fluffy);
        tester.assertEq(sheet.getRange(2, 3).getValue(), 6);
    }

    export function getSet2(tester: ServerTester) {
        const sheet = newSheet(`
            Species  | Name   | Age
            dog      | Fluffy | 5
            cat      | Billy  | 3
            goldfish | Bob    | 1
            dog      | Karl   | 6
        `);
        const table = Pet.Table.open(sheet);

        const fluffy = table.get('Fluffy')!;
        fluffy.age = 6;
        table.set('Fluffy', fluffy);
        tester.assertEq(sheet.getRange(2, 3).getValue(), 6);
        table.setRow(7, fluffy);
        tester.assertEq(sheet.getRange(7, 1, 1, 3).getValues(), [['dog', 'Fluffy', 6]]);
    }
}