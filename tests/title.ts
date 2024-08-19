import test from 'ava';
import { title, spread, rest, getObjectPath, getKeysWithTitles } from "../src/title.js";

/**
 * Note: The current implementation relies on `Object.entries()` to find an object's properties.
 * This means that non-enumerable properties (e.g., symbol properties, accessors in classes) are 
 * skipped. While that's not necessarily ideal, any other solution would involve further design 
 * decisions, incl. about enumeration order. Those decisions should be deferred until it's clear
 * what use cases cannot be adequately addressed with current workarounds.
 * 
 * The simplest workaround is to attach a string title using the `@title` decorator. Properties
 * with titles are always included and ordered after the enumerable properties. Using `@title` is
 * necessary in any case for symbol-keyed properties, since these could not otherwise be 
 * represented in a spreadsheet.
 */

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

    let objA = new ClassA();
    t.deepEqual(getObjectPath(['Foo'], objA), ['foo']);
    t.deepEqual(getObjectPath(['Bar'], objA), ['bar']);
    t.deepEqual(getObjectPath(['Baz'], objA), ['Baz'], 'use title as fallback');

    t.deepEqual(getKeysWithTitles(objA), [
        [['foo'], ['Foo']],
        [['bar'], ['Bar']],
    ]);
    (objA as any).Baz = 42;
    t.deepEqual(getKeysWithTitles(objA), [
        [['foo'], ['Foo']],
        [['Baz'], ['Baz']], // own enumerable string props before accessors
        [['bar'], ['Bar']],
    ]);

    objA = new ClassA();
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

    t.deepEqual(getObjectPath(['Apples', 'Foo'], ClassB), ['a', 'foo']);
    t.deepEqual(getObjectPath(['Apples', 'Bar'], ClassB), ['a', 'bar']);
    t.deepEqual(getObjectPath(['Apples', 'Baz'], ClassB), ['a', 'Baz'], 'use title as fallback');
    t.deepEqual(getObjectPath(['Oranges'], ClassB), ['b']);
    t.deepEqual(getObjectPath(['Bicycles'], ClassB), [mySymbol]);

    t.deepEqual(getKeysWithTitles(objB), [
        [['a', 'foo'], ['Apples', 'Foo']],
        [['a', 'bar'], ['Apples', 'Bar']],
        [['b'], ['Oranges']],
        [[mySymbol], ['Bicycles']],
    ]);

    class ClassC {
        @title('Apples')
        a = objA;

        @title('')
        b = 42;
    }
    const objC = new ClassC();
    t.deepEqual(getKeysWithTitles(objC), [
        [['a', 'foo'], ['Apples', 'Foo']],
        [['a', 'bar'], ['Apples', 'Bar']],
    ]);
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

    t.deepEqual(getKeysWithTitles(new ClassA()), [
        [['foo', 0], ['A']],
        [['foo', 1], ['B']],
        [['foo', 2], ['C']],
        [['foo', 3], ['D']],
        [['bar'], ['Bar']],
    ]);

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
    t.deepEqual(getObjectPath(['Apples', 'Bar'], objB), ['a', 'bar']);
    t.deepEqual(getObjectPath(['Oranges'], objB), ['b']);
    t.deepEqual(getObjectPath(['Bicycles'], objB), [mySymbol]);

    t.deepEqual(getKeysWithTitles(objB), [
        [['a', 'foo', 0], ['Apples', 'A']],
        [['a', 'foo', 1], ['Apples', 'B']],
        [['a', 'foo', 2], ['Apples', 'C']],
        [['a', 'foo', 3], ['Apples', 'D']],
        [['a', 'bar'], ['Apples', 'Bar']],
        [['b'], ['Oranges']],
        [[mySymbol], ['Bicycles']],
    ]);
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

    t.deepEqual(getKeysWithTitles(objB), [
        [['a', 'foo'], ['Foo']],
        [['a', 'bar'], ['Bar']],
        [['b'], ['Oranges']],
    ]);

    const objBB = new ClassB();
    const objAB = new ClassA();
    (objAB as any).baz = 'blue';
    objBB.a = objAB;
    (objBB as any).c = true;

    t.deepEqual(getKeysWithTitles(objBB), [
        [['a', 'foo'], ['Foo']],
        [['a', 'bar'], ['Bar']],
        // cannot be included: on import, this would be assigned to `objBB.baz`
        // [['a', 'baz'], ['baz']],
        [['b'], ['Oranges']],
        // can be included: on import, this will be assigned to `objBB.c`
        [['c'], ['c']],
    ]);

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

    t.deepEqual(getKeysWithTitles(objC), [
        [['a', 0, 'foo'], ['Onions', 'Foo']],
        [['a', 0, 'bar'], ['Onions', 'Bar']],
        [['a', 1, 'foo'], ['Tomatoes', 'Foo']],
        [['a', 1, 'bar'], ['Tomatoes', 'Bar']],
        [['b', 'a', 'foo'], ['Foo']],
        [['b', 'a', 'bar'], ['Bar']],
        [['b', 'b'], ['Oranges']],
    ]);

    const objCC = new ClassC();
    objCC.a = [objAB, objAB];
    objCC.b = objBB;
    (objCC as any).c = 0;

    t.deepEqual(getKeysWithTitles(objCC), [
        [['a', 0, 'foo'], ['Onions', 'Foo']],
        // can be included: adequately identified due to array spreading titles
        [['a', 0, 'baz'], ['Onions', 'baz']],
        [['a', 0, 'bar'], ['Onions', 'Bar']],   // order: accessors after own properties
        [['a', 1, 'foo'], ['Tomatoes', 'Foo']],
        // can be included: adequately identified due to array spreading titles
        [['a', 1, 'baz'], ['Tomatoes', 'baz']],
        [['a', 1, 'bar'], ['Tomatoes', 'Bar']], // order: accessors after own properties
        [['b', 'a', 'foo'], ['Foo']],
        [['b', 'a', 'bar'], ['Bar']],
        // cannot be included: on import, this would be assigned to `objCC.baz`
        // [['b', 'a', 'baz'], ['baz']],
        [['b', 'b'], ['Oranges']],
        // can be included: on import, this will be assigned to `objCC.c`
        [['c'], ['c']]
    ]);
});

test('rest collection', t => {
    class ClassA {
        @title('Foo')
        foo = 3.14;

        @title('Bar')
        accessor bar = false;
    }

    const objA = new ClassA();
    t.deepEqual(getObjectPath(['Baz'], objA, undefined, true), ['Baz']);
    t.deepEqual(getObjectPath(['Baz'], objA, undefined, false), undefined);

    const objAA = new ClassA();
    (objAA as any).baz = 25;

    t.deepEqual(getKeysWithTitles(objAA), [
        [['foo'], ['Foo']],
        // can be included: neither @spread nor @rest apply
        [['baz'], ['baz']],
        [['bar'], ['Bar']], // order: accessors after own properties
    ])

    class ClassB {
        @spread @rest
        a = objA;

        @title('Apples')
        b = 0;
    }

    const objB = new ClassB();
    t.deepEqual(getObjectPath(['Foo'], objB), ['a', 'foo']);
    t.deepEqual(getObjectPath(['Bar'], objB), ['a', 'bar']);
    t.deepEqual(getObjectPath(['Apples'], objB), ['b']);
    t.deepEqual(getObjectPath(['Baz'], objB), ['a', 'Baz'], 'unmatched titles should be assigned to a');

    t.deepEqual(getKeysWithTitles(objB), [
        [['a', 'foo'], ['Foo']],
        [['a', 'bar'], ['Bar']],
        [['b'], ['Apples']],
    ]);

    const objBB = new ClassB();
    const objAB = new ClassA();
    (objAB as any).baz = 25;
    objBB.a = objAB;
    (objBB as any).c = 0;

    t.deepEqual(getKeysWithTitles(objBB), [
        [['a', 'foo'], ['Foo']],
        // can be included: both @spread and @rest apply
        [['a', 'baz'], ['baz']],
        [['a', 'bar'], ['Bar']], // order: accessors after own properties
        [['b'], ['Apples']],
        // cannot be included due to @rest
        // on import, this property would be assigned to `objBB.a.c`
        //[['c'], ['c']],
    ]);

    class ClassC {
        x = 25;

        @spread @rest
        y = objB;
    }

    const objC = new ClassC();
    t.deepEqual(getObjectPath(['x'], objC), ['x']);
    t.deepEqual(getObjectPath(['y'], objC), ['y']);
    t.deepEqual(getObjectPath(['Apples'], objC), ['y', 'b']);
    t.deepEqual(getObjectPath(['Foo'], objC), ['y', 'a', 'foo']);
    t.deepEqual(getObjectPath(['Bar'], objC), ['y', 'a', 'bar']);
    t.deepEqual(getObjectPath(['Baz'], objC), ['y', 'a', 'Baz'], 'unmatched titles should be assigned to y.a');

    t.deepEqual(getKeysWithTitles(objC), [
        [['x'], ['x']],
        [['y', 'a', 'foo'], ['Foo']],
        [['y', 'a', 'bar'], ['Bar']],
        [['y', 'b'], ['Apples']],
    ]);

    const objCC = new ClassC();
    objCC.y = objBB;
    (objCC as any).z = 4;

    t.deepEqual(getKeysWithTitles(objCC), [
        [['x'], ['x']],
        [['y', 'a', 'foo'], ['Foo']],
        // can be included: both @spread and @rest apply
        [['y', 'a', 'baz'], ['baz']],
        [['y', 'a', 'bar'], ['Bar']],   // order: accessors after own properties
        [['y', 'b'], ['Apples']],
        // cannot be included due to @rest
        // on import, this property would be assigned to `objCC.y.a.c`
        //[['y', 'c'], ['c']],
        // on import, this property would be assigned to `objCC.y.a.z`
        //[['z'], ['z']]
    ]);

    class ClassD {
        x = 25;

        @spread
        y = objB;
    }

    const objD = new ClassD();
    t.deepEqual(getObjectPath(['Apples'], objD), ['y', 'b']);
    t.deepEqual(getObjectPath(['Foo'], objD), ['y', 'a', 'foo']);
    t.deepEqual(getObjectPath(['Bar'], objD), ['y', 'a', 'bar']);
    t.deepEqual(getObjectPath(['Baz'], objD), ['Baz'], 'unmatched titles should be retained at top level');

    const objDD = new ClassD();
    objDD.y = objBB;
    (objDD as any).z = 4;

    t.deepEqual(getKeysWithTitles(objDD), [
        [['x'], ['x']],
        [['y', 'a', 'foo'], ['Foo']],
        [['y', 'a', 'bar'], ['Bar']],
        [['y', 'b'], ['Apples']],
        // cannot be included due to @spread without @rest
        // on import, this property would be assigned to `objDD.c`
        // [['y', 'a', 'baz'], ['baz']],
        // on import, this property would be assigned to `objDD.c`
        // [['y', 'c'], ['c']],
        // can be included: without @rest, extra properties are retained at the root level
        [['z'], ['z']]
    ]);

    class ClassE {
        @spread @rest
        x = objA;

        @spread @rest
        y = objB;
    }
    const objE = new ClassE();
    t.throws(() => getObjectPath(['Foo'], objE));
});
