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

test('object spreading', t => {
    class ClassA {
        @title('Foo')
        foo = 3.14;

        @title('Bar')
        accessor bar = false;
    }

    const objA = new ClassA();
    class ClassB {
        @spread 
        @title('Apples')    // title 'Apples' ignored because of @spread
        a = objA;           // titles of ClassA's properties used instead

        @title('Oranges')
        b = 42;
    }

    const objB = new ClassB();
    t.deepEqual(getObjectPath(['Foo'], objB), ['a', 'foo']);
    t.deepEqual(getObjectPath(['Bar'], objB), ['a', 'bar']);
    t.deepEqual(getObjectPath(['Oranges'], objB), ['b']);

    // No corresponding annotations exist, so these titles are simply passed through
    t.deepEqual(getObjectPath(['Apples'], objB), ['Apples']);
    t.deepEqual(getObjectPath(['Apples', 'Foo'], objB), ['Apples', 'Foo']);
    t.deepEqual(getObjectPath(['Apples', 'Bar'], objB), ['Apples', 'Bar']);

    class ClassC {
        @spread
        @title('Onions', 'Tomatoes')
        a = [objA, objA];

        @spread
        @title('Bicycles')  // title 'Bicycles' ignored because of @spread
        b = objB;
    }

    const objC = new ClassC();
    t.deepEqual(getObjectPath(['Onions'], objC), ['a', 0]);
    t.deepEqual(getObjectPath(['Tomatoes'], objC), ['a', 1]);
    t.deepEqual(getObjectPath(['Bicycles'], objC), ['Bicycles']);
    t.deepEqual(getObjectPath(['Cucumbers'], objC), ['Cucumbers']);

    t.deepEqual(getObjectPath(['Onions', 'Foo'], objC), ['a', 0, 'foo']);
    t.deepEqual(getObjectPath(['Onions', 'Bar'], objC), ['a', 0, 'bar']);
    t.deepEqual(getObjectPath(['Onions', 'Baz'], objC), ['a', 0, 'Baz']);
    t.deepEqual(getObjectPath(['Tomatoes', 'Foo'], objC), ['a', 1, 'foo']);
    t.deepEqual(getObjectPath(['Tomatoes', 'Bar'], objC), ['a', 1, 'bar']);
    t.deepEqual(getObjectPath(['Tomatoes', 'Baz'], objC), ['a', 1, 'Baz']);

    t.deepEqual(getObjectPath(['Apples'], objC), ['Apples'], 'should not match (b/c @spread)');
    t.deepEqual(getObjectPath(['Apples', 'Foo'], objC), ['Apples', 'Foo'], 'should not match (b/c @spread)');
    t.deepEqual(getObjectPath(['Foo'], objC), ['b', 'a', 'foo'], 'should match (spread deeply)');
    t.deepEqual(getObjectPath(['Bar'], objC), ['b', 'a', 'bar'], 'should match (spread deeply)');
    t.deepEqual(getObjectPath(['Oranges'], objC), ['b', 'b']);
    t.deepEqual(getObjectPath(['Oranges', 'Foo'], objC), ['b', 'b', 'Foo']);
});
