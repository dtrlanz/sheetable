import test from 'ava';
import { index, getIndexKeys, TupleMap, Index } from "../src/index.js";
import { title, getIndexTitles } from "../src/title.js";
import { sheet } from './util/sheet-navigation.js';
import { SheetClient } from '../src/sheet-server.js';
import { Header } from '../src/headers.js';

test('get keys and titles for simple index', t => {
    const sym = Symbol('sym');

    class A {
        @index
        foo = 1;
        bar = 2;
        baz = 3;
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(A), ['foo']);
    t.deepEqual(getIndexTitles(A), ['foo']);

    class B {
        @index @title('Foo')
        foo = 1;
        bar = 2;
        baz = 3;
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(B), ['foo']);
    t.deepEqual(getIndexTitles(B), ['Foo']);

    class C {
        foo = 1;
        @index
        bar = 2;
        baz = 3;
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(C), ['bar']);
    t.deepEqual(getIndexTitles(C), ['bar']);

    class D {
        foo = 1;
        @index @title('Bar')
        bar = 2;
        baz = 3;
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(D), ['bar']);
    t.deepEqual(getIndexTitles(D), ['Bar']);

    class E {
        foo = 1;
        bar = 2;
        baz = 3;
        @index
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(E), [sym]);
    t.throws(() => getIndexTitles(E));

    class F {
        foo = 1;
        bar = 2;
        baz = 3;
        @index @title('Sym')
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(F), [sym]);
    t.deepEqual(getIndexTitles(F), ['Sym']);
});

test('get keys and titles for tuple index', t => {
    const sym = Symbol('sym');

    class A {
        @index
        foo = 1;
        @index
        bar = 2;
        baz = 3;
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(A), ['foo', 'bar']);
    t.deepEqual(getIndexTitles(A), ['foo', 'bar']);

    class B {
        @index @title('Foo')
        foo = 1;
        @index
        bar = 2;
        baz = 3;
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(B), ['foo', 'bar']);
    t.deepEqual(getIndexTitles(B), ['Foo', 'bar']);

    class C {
        foo = 1;
        @index @title('Bar')
        bar = 2;
        @index @title('Baz')
        baz = 3;
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(C), ['bar', 'baz']);
    t.deepEqual(getIndexTitles(C), ['Bar', 'Baz']);

    class D {
        foo = 1;
        @index @title('Bar')
        bar = 2;
        @index @title('Baz')
        baz = 3;
        @index @title('Sym')
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(D), ['bar', 'baz', sym]);
    t.deepEqual(getIndexTitles(D), ['Bar', 'Baz', 'Sym']);

    class E {
        @index
        foo = 1;
        @index
        bar = 2;
        @index
        baz = 3;
        @index
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(E), ['foo', 'bar', 'baz', sym]);
    t.throws(() => getIndexTitles(E));

    class F {
        @index @title('Foo')
        foo = 1;
        @index @title('Bar')
        bar = 2;
        @index @title('Baz')
        baz = 3;
        @index @title('Sym')
        [sym] = 4;
    }
    t.deepEqual(getIndexKeys(F), ['foo', 'bar', 'baz', sym]);
    t.deepEqual(getIndexTitles(F), ['Foo', 'Bar', 'Baz', 'Sym']);
});

test('tuple map', t => {
    const map = new TupleMap();
    map.set([], '');
    map.set(['a'], 'a');
    map.set(['a', 'a'], 'aa');
    map.set(['a', 'b'], 'ab');
    map.set(['b'], 'b');
    map.set(['b', 'a'], 'ba');
    map.set(['b', 'b'], 'bb');
    map.set(['b', 'b', 'a'], 'bba');
    map.set(['b', 'b', 'b'], 'bbb');
    t.is(map.get([]), '');
    t.is(map.get(['a']), 'a');
    t.is(map.get(['a', 'a']), 'aa');
    t.is(map.get(['a', 'b']), 'ab');
    t.is(map.get(['b']), 'b');
    t.is(map.get(['b', 'a']), 'ba');
    t.is(map.get(['b', 'b']), 'bb');
    t.is(map.get(['b', 'b', 'a']), 'bba');
    t.is(map.get(['b', 'b', 'b']), 'bbb');
    map.set([], 'x');
    map.set(['a'], 'ax');
    map.set(['a', 'a'], 'aax');
    map.set(['b', 'b'], 'bbx');
    map.set(['b', 'b', 'a'], 'bbax');
    t.is(map.get([]), 'x');
    t.is(map.get(['a']), 'ax');
    t.is(map.get(['a', 'a']), 'aax');
    t.is(map.get(['a', 'b']), 'ab');
    t.is(map.get(['b']), 'b');
    t.is(map.get(['b', 'a']), 'ba');
    t.is(map.get(['b', 'b']), 'bbx');
    t.is(map.get(['b', 'b', 'a']), 'bbax');
    t.is(map.get(['b', 'b', 'b']), 'bbb');
});

test('index set & get', async t => {
    const { headers, data } = await SheetClient.fromSheet(sheet`
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
    `).get('all');
    if (!data) throw new Error('unreachable');

    class Test {
        a = { a1: 0, a2: 2 };
        @index
        b = 0;
        @index.where(({ withObj }) => withObj)
        c = { c1: 0, c2: { c21: 0, c22: 0, c23: 0 } };
        @index.where(({ complex }) => complex)
        d = 0;
        e = { e1: { e11: 0 } };
        @index.where(({ complex }) => complex)
        f = 0;
    }
    const header0 = Header.open(Test, headers);
    const index0 = new Index(Test, header0);
    index0.set([123], 100);
    index0.set([123, 456], 200);
    index0.set([123, 456, 789], 300);
    t.is(index0.get([12]), undefined);
    t.is(index0.get([123]), 100);
    t.is(index0.get([123, 456]), 200);
    t.is(index0.get([123, 456, 789]), 300);
    let id = 0;
    index0.initAll(index0.getIndexedPropsFromRows(data.rows, data.colNumbers), () => id++);
    const idxValues0 = [2, 12, 22, 32, 42, 52, 62];
    for (let i = 0; i < idxValues0.length; i++) {
        t.is(index0.get([idxValues0[i]]), i);
    }

    const header1 = Header.open(Test, headers, { complex: true });
    const index1 = new Index(Test, header1, { complex: true });
    id = 0;
    index1.initAll(index1.getIndexedPropsFromRows(data.rows, data.colNumbers), () => id++);
    const idxValues1 = [
        [2, 7, 9],
        [12, 17, 19], 
        [22, 27, 29], 
        [32, 37, 39], 
        [42, 47, 49], 
        [52, 57, 59], 
        [62, 67, 69],
    ];
    for (let i = 0; i < idxValues1.length; i++) {
        t.is(index1.get(idxValues1[i]), i);
    }

    const header2 = Header.open(Test, headers, { withObj: true });
    const index2 = new Index(Test, header2, { withObj: true });
    id = 0;
    index2.initAll(index2.getIndexedPropsFromRows(data.rows, data.colNumbers), () => id++);
    const idxValues2 = [
        [2, { c1: 3, c2: { c21: 4, c22: 5, c23: 6 } }],
        [12, { c1: 13, c2: { c21: 14, c22: 15, c23: 16 } }],
        [22, { c1: 23, c2: { c21: 24, c22: 25, c23: 26 } }],
        [32, { c1: 33, c2: { c21: 34, c22: 35, c23: 36 } }],
        [42, { c1: 43, c2: { c21: 44, c22: 45, c23: 46 } }],
        [52, { c1: 53, c2: { c21: 54, c22: 55, c23: 56 } }],
        [62, { c1: 63, c2: { c21: 64, c22: 65, c23: 66 } }],
    ];
    for (let i = 0; i < idxValues2.length; i++) {
        t.is(index2.get([idxValues2[i][0], JSON.stringify(idxValues2[i][1])]), i);
    }
});