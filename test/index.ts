import test from 'ava';
import { index, getIndexKeys, TupleMap } from "../src/index.js";
import { title, getIndexTitles } from "../src/title.js";

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