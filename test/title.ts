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
    t.deepEqual(getObjectPath(['Baz'], ClassA), undefined);

    const objA = new ClassA();
    t.deepEqual(getObjectPath(['Foo'], objA), ['foo']);
    t.deepEqual(getObjectPath(['Bar'], objA), ['bar']);
    t.deepEqual(getObjectPath(['Baz'], objA), undefined);

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
    t.deepEqual(getObjectPath(['Apples', 'Baz'], objB), undefined);
    t.deepEqual(getObjectPath(['Oranges'], objB), ['b']);
    t.deepEqual(getObjectPath(['Bicycles'], objB), [mySymbol]);
})