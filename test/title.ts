import test from 'ava';
import { title, spread, getObjectPath } from "../src/title.js";

test('simple title conversion', t => {
    class ClassA {
        @title('Foo')
        foo = 3.14;

        @title('Bar')
        accessor bar = false;
    }

    t.deepEqual(getObjectPath(['Foo'], ClassA), ['foo']);
    t.deepEqual(getObjectPath(['Bar'], ClassA), ['bar']);
    t.deepEqual(getObjectPath(['Baz'], ClassA), ['Baz'], 'use title as fallback');

    const objA = new ClassA();
    t.deepEqual(getObjectPath(['Foo'], objA), ['foo']);
    t.deepEqual(getObjectPath(['Bar'], objA), ['bar']);
    t.deepEqual(getObjectPath(['Baz'], objA), ['Baz'], 'use title as fallback');

    const mySymbol = Symbol('mySymbol');
    class ClassB {
        @title('Apples')
        a = objA;

        @title('Oranges')
        b = 42;

        @title('Bicycles')
        [mySymbol] = true;
    }

    const objB = new ClassB();
    t.deepEqual(getObjectPath(['Apples', 'Foo'], objB), ['a', 'foo']);
    t.deepEqual(getObjectPath(['Apples', 'Bar'], objB), ['a', 'bar']);
    t.deepEqual(getObjectPath(['Apples', 'Baz'], objB), ['a', 'Baz'], 'use title as fallback');
    t.deepEqual(getObjectPath(['Oranges'], objB), ['b']);
    t.deepEqual(getObjectPath(['Bicycles'], objB), [mySymbol]);
});

test('array spreading', t => {
    class ClassA {
        @spread @title('A', 'B', 'C', 'D')
        foo = [0, 1, 2, 3];

        @title('Bar')
        accessor bar = false;
    }

    t.deepEqual(getObjectPath(['A'], ClassA), ['foo', 0]);
    t.deepEqual(getObjectPath(['B'], ClassA), ['foo', 1]);
    t.deepEqual(getObjectPath(['C'], ClassA), ['foo', 2]);
    t.deepEqual(getObjectPath(['D'], ClassA), ['foo', 3]);
    t.deepEqual(getObjectPath(['Bar'], ClassA), ['bar']);

    const objA = new ClassA();
    const mySymbol = Symbol('mySymbol');
    class ClassB {
        @title('Apples')
        a = objA;

        @title('Oranges')
        b = 42;

        @title('Bicycles')
        [mySymbol] = true;
    }

    const objB = new ClassB();
    t.deepEqual(getObjectPath(['Apples', 'A'], objB), ['a', 'foo', 0]);
    t.deepEqual(getObjectPath(['Apples', 'B'], objB), ['a', 'foo', 1]);
    t.deepEqual(getObjectPath(['Apples', 'C'], objB), ['a', 'foo', 2]);
    t.deepEqual(getObjectPath(['Apples', 'D'], objB), ['a', 'foo', 3]);
    t.deepEqual(getObjectPath(['Oranges'], objB), ['b']);
    t.deepEqual(getObjectPath(['Bicycles'], objB), [mySymbol]);
});
