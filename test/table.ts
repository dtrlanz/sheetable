import test from 'ava';
import { index } from "../src/index.js";
import { SheetClient } from "../src/client.js";
import { sheet } from "./util/sheet-navigation.js";
import { Table } from '../src/table.js';

const client = SheetClient.fromSheet(sheet`
    a  |    | b  | c  |     |     |     | d  | e   | f  |
    a1 | a2 |    | c1 | c2  |     |     |    | e1  |    |
       |    |    |    | c21 | c22 | c23 |    | e11 |    |
     0 |  1 |  2 |  3 |   4 |   5 |   6 |  7 |   8 |  9 |
    10 | 11 | 12 | 13 |  14 |  15 |  16 | 17 |  18 | 19 |
    20 | 21 | 22 | 23 |  24 |  25 |  26 | 27 |  28 | 29 |
    30 | 31 | 32 | 33 |  34 |  35 |  36 | 37 |  38 | 39 |
    40 | 41 | 42 | 43 |  44 |  45 |  46 | 47 |  48 | 49 |
    50 | 51 | 52 | 53 |  54 |  55 |  56 | 57 |  58 | 59 |
    60 | 61 | 62 | 63 |  64 |  65 |  66 | 67 |  68 | 69 |
`);

class Test {
    @index
    a = { a1: 0, a2: 0 };
    @index
    b = 0;
    c = { c1: 0, c2: { c21: 0, c22: 0, c23: 0 } };
    d = 0;
    e = { e1: { e11: 0 } };
    f = 0;
}

function toObj(a1: number, a2?: number, b?: number, c1?: number, c21?: number, c22?: number, c23?: number, d?: number, e11?: number, f?: number) {
    a2 ??= a1 + 1;
    b ??= a1 + 2;
    c1 ??= a1 + 3;
    c21 ??= a1 + 4;
    c22 ??= a1 + 5;
    c23 ??= a1 + 6;
    d ??= a1 + 7;
    e11 ??= a1 + 8;
    f ??= a1 + 9;
    const obj = new Test();
    obj.a = { a1, a2 };
    obj.b = b;
    obj.c = { c1, c2: { c21, c22, c23 } };
    obj.d = d;
    obj.e = { e1: { e11 } };
    obj.f = f;
    return obj;
}

test('open table', async t => {
    const table = await Table.open(Test, { client });
    // retrieve nth item
    for (let i = 0; i < 7; i++) {
        t.deepEqual(await table.at(i), toObj(i * 10));
    }
    t.is(await table.at(7), undefined);
    // retrieve nth-last item
    for (let i = -1; i >= -7; i--) {
        t.deepEqual(await table.at(i), toObj((7 + i) * 10));
    }
    t.is(await table.at(-8), undefined);
    // retrieve item by indexed properties
    for (let i = 0; i < 70; i += 10) {
        t.deepEqual(await table.get({ a1: i, a2: i + 1}, i + 2), toObj(i));
    }
    t.is(await table.get({ a1: 0, a2: 0}, 0), undefined);
});

test('create table', async t => {
    const data = [0, 1, 2, 3, 4, 5, 6].map(i => toObj(i * 10));
    const table = await Table.create(data, { client: SheetClient.fromSheet(sheet``) });
    // retrieve nth item
    for (let i = 0; i < 7; i++) {
        t.deepEqual(await table.at(i), toObj(i * 10));
    }
    t.is(await table.at(7), undefined);
    // retrieve nth-last item
    for (let i = -1; i >= -7; i--) {
        t.deepEqual(await table.at(i), toObj((7 + i) * 10));
    }
    t.is(await table.at(-8), undefined);
    // retrieve item by indexed properties
    for (let i = 0; i < 70; i += 10) {
        t.deepEqual(await table.get({ a1: i, a2: i + 1}, i + 2), toObj(i));
    }
    t.is(await table.get({ a1: 0, a2: 0}, 0), undefined);
});

test('set', async t => {
    class A {
        @index
        name: string;
        age: number;
        constructor(name: string, age: number) {
            this.name = name;
            this.age = age;
        }
    }
    const data = [
        new A('Amy', 24),
        new A('Bob', 98),
    ];
    const table = await Table.create(data, { client: SheetClient.fromSheet(sheet``) });
    function getCache() {
        return table['slots'].map(s => s.cached);
    }

    t.deepEqual(getCache(), [
        new A('Amy', 24),
        new A('Bob', 98),
    ], 'records from table creation should be present');

    table.set(new A('Carly', 45));
    table.set(new A('Dan', 62));

    t.deepEqual(getCache(), [
        new A('Amy', 24),
        new A('Bob', 98),
        new A('Carly', 45),
        new A('Dan', 62),
    ], 'new records should be added to the end');

    table.set(new A('Amy', 25));
    table.set(new A('Carly', 46));

    t.deepEqual(getCache(), [
        new A('Amy', 25),
        new A('Bob', 98),
        new A('Carly', 46),
        new A('Dan', 62),
    ], 'updated records should keep their positions');
});
