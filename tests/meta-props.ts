import test from 'ava';
import { Constructor, MetaPropReader, MetaProperty } from "../src/meta-props.js";

test('reading something not decorated', t => {
    class ClassA {}
    const obj = new ClassA();
    let mp = new MetaProperty('prop', 0);

    t.is(new MetaPropReader(ClassA).get(mp), 0);
    t.is(new MetaPropReader(obj).get(mp), 0);
})

test('simple meta props', t => {
    const palatableProp = new MetaProperty<string | undefined>('palatable', undefined);
    const palatable = palatableProp.getDecorator('🍕');
    const pReader = {
        get(obj: object | Constructor, key?: string | symbol) {
            return new MetaPropReader(obj).get(palatableProp, key);
        },
        entries(obj: object | Constructor) {
            return new MetaPropReader(obj).entries(palatableProp);
        },
    }

    const laudableProp = new MetaProperty<string | undefined>('laudable', undefined);
    function laudable(value: string) {
        return laudableProp.getDecorator(value);
    }
    const lReader = {
        get(obj: object | Constructor, key?: string | symbol) {
            return new MetaPropReader(obj).get(laudableProp, key);
        },
        entries(obj: object | Constructor) {
            return new MetaPropReader(obj).entries(laudableProp);
        },
        list(obj: object | Constructor) {
            return new MetaPropReader(obj).list(laudableProp);
        },
    }

    // set meta props
    @palatable
    class ClassA {
        @laudable('very good')
        foo: string = 'abc';

        @palatable
        @laudable('brilliant')
        accessor bar: number = 42;
    }

    // retrieve meta prop via class
    t.is(pReader.get(ClassA), '🍕');
    t.is(pReader.get(ClassA, 'foo'), undefined);
    t.is(pReader.get(ClassA, 'bar'), '🍕');
    t.deepEqual(pReader.entries(ClassA), [['bar', '🍕']]);

    t.is(lReader.get(ClassA), undefined);
    t.is(lReader.get(ClassA, 'foo'), 'very good');
    t.is(lReader.get(ClassA, 'bar'), 'brilliant');
    // accessor decorator runs before field decorator
    t.deepEqual(lReader.entries(ClassA), [['bar', 'brilliant'], ['foo', 'very good']]);

    // retrieve meta prop via object
    const objA = new ClassA();
    t.is(pReader.get(objA), '🍕');
    t.is(pReader.get(objA, 'foo'), undefined);
    t.is(pReader.get(objA, 'bar'), '🍕');
    t.deepEqual(pReader.entries(objA), [['bar', '🍕']])

    t.is(lReader.get(objA), undefined);
    t.is(lReader.get(objA, 'foo'), 'very good');
    t.is(lReader.get(objA, 'bar'), 'brilliant');
    t.deepEqual(lReader.entries(objA), [['bar', 'brilliant'], ['foo', 'very good']]);

    // subclass inherits meta props
    class ClassB extends ClassA {}

    t.is(pReader.get(ClassB), '🍕');
    t.is(pReader.get(ClassB, 'foo'), undefined);
    t.is(pReader.get(ClassB, 'bar'), '🍕');
    t.deepEqual(pReader.entries(ClassB), [['bar', '🍕']])

    t.is(lReader.get(ClassB), undefined);
    t.is(lReader.get(ClassB, 'foo'), 'very good');
    t.is(lReader.get(ClassB, 'bar'), 'brilliant');
    t.deepEqual(lReader.entries(ClassB), [['bar', 'brilliant'], ['foo', 'very good']]);

    // subclass can shadow superclass meta props
    @laudable('magnificent')
    class ClassC extends ClassB {
        @palatable
        @laudable('not bad')
        foo = 'def';

        @palatable
        baz = true;
    }

    t.is(pReader.get(ClassC), '🍕');
    t.is(pReader.get(ClassC, 'foo'), '🍕');
    t.is(pReader.get(ClassC, 'bar'), '🍕');
    t.is(pReader.get(ClassC, 'baz'), '🍕');
    t.deepEqual(pReader.entries(ClassC), [['bar', '🍕'], ['foo', '🍕'], ['baz', '🍕']]);

    t.is(lReader.get(ClassC), 'magnificent');
    t.is(lReader.get(ClassC, 'foo'), 'not bad');
    t.is(lReader.get(ClassC, 'bar'), 'brilliant');
    t.is(lReader.get(ClassC, 'baz'), undefined);
    t.deepEqual(lReader.entries(ClassC), [['bar', 'brilliant'], ['foo', 'not bad']]);

    // superclass meta props are unchanged
    t.is(pReader.get(ClassA), '🍕');
    t.is(pReader.get(ClassA, 'foo'), undefined);
    t.is(pReader.get(ClassA, 'bar'), '🍕');
    t.deepEqual(pReader.entries(ClassA), [['bar', '🍕']])

    t.is(lReader.get(ClassA), undefined);
    t.is(lReader.get(ClassA, 'foo'), 'very good');
    t.is(lReader.get(ClassA, 'bar'), 'brilliant');
    t.deepEqual(lReader.entries(ClassA), [['bar', 'brilliant'], ['foo', 'very good']]);

    t.is(pReader.get(ClassB), '🍕');
    t.is(pReader.get(ClassB, 'foo'), undefined);
    t.is(pReader.get(ClassB, 'bar'), '🍕');
    t.deepEqual(pReader.entries(ClassB), [['bar', '🍕']])

    t.is(lReader.get(ClassB), undefined);
    t.is(lReader.get(ClassB, 'foo'), 'very good');
    t.is(lReader.get(ClassB, 'bar'), 'brilliant');
    t.deepEqual(lReader.entries(ClassB), [['bar', 'brilliant'], ['foo', 'very good']]);

    // list() returns truthy entries
    class ClassD extends ClassC {
        @laudable('')
        bam = 11;
    }
    // `bam` included among entries b/c value exists
    t.deepEqual(lReader.entries(ClassD), [['bar', 'brilliant'], ['foo', 'not bad'], ['bam', '']]);
    // `list()` returns truthy values
    t.deepEqual(lReader.list(ClassD), ['bar', 'foo']);
});

test('conditional meta props', t => {
    const laudableProp = new MetaProperty<string | undefined>('laudable', undefined);
    function laudable(value: string) {
        return laudableProp.getDecorator(value);
    }
    const normal = {
        entries(obj: object | Constructor) {
            return new MetaPropReader(obj).entries(laudableProp);
        },
    }
    const sunny = {
        entries(obj: object | Constructor) {
            return new MetaPropReader(obj, { weather: 'sunny' }).entries(laudableProp);
        },
    }
    const rainy = {
        entries(obj: object | Constructor) {
            return new MetaPropReader(obj, { weather: 'rainy' }).entries(laudableProp);
        },
    }
    const stormy = {
        entries(obj: object | Constructor) {
            return new MetaPropReader(obj, { weather: 'stormy' }).entries(laudableProp);
        },
    }

    // set meta props
    class ClassA {
        @laudable('very good')
        @laudable('nice').where(({weather}) => weather === 'sunny')
        @laudable('cool').where(({weather}) => weather === 'rainy')
        foo: string = 'abc';

        @laudable('brilliant')
        @laudable('powerful').where(({weather}) => weather === 'stormy')
        accessor bar: number = 42;
    }

    // default values
    t.deepEqual(normal.entries(ClassA), [['bar', 'brilliant'], ['foo', 'very good']]);

    // fall back to default values where no specific condition obtains
    t.deepEqual(sunny.entries(ClassA), [['bar', 'brilliant'], ['foo', 'nice']]);
    t.deepEqual(rainy.entries(ClassA), [['bar', 'brilliant'], ['foo', 'cool']]);
    t.deepEqual(stormy.entries(ClassA), [['bar', 'powerful'], ['foo', 'very good']]);

    // subclass can add further conditional values
    class ClassB extends ClassA {
        @laudable('a force of nature').where(({weather}) => weather === 'stormy')
        foo = 'def';
    }

    // default values
    t.deepEqual(normal.entries(ClassB), [['bar', 'brilliant'], ['foo', 'very good']]);

    // fall back to default values where no specific condition obtains
    t.deepEqual(sunny.entries(ClassB), [['bar', 'brilliant'], ['foo', 'nice']]);
    t.deepEqual(rainy.entries(ClassB), [['bar', 'brilliant'], ['foo', 'cool']]);
    t.deepEqual(stormy.entries(ClassB), [['bar', 'powerful'], ['foo', 'a force of nature']]);

    // superclass meta props are unchanged
    t.deepEqual(normal.entries(ClassA), [['bar', 'brilliant'], ['foo', 'very good']]);
    t.deepEqual(sunny.entries(ClassA), [['bar', 'brilliant'], ['foo', 'nice']]);
    t.deepEqual(rainy.entries(ClassA), [['bar', 'brilliant'], ['foo', 'cool']]);
    t.deepEqual(stormy.entries(ClassA), [['bar', 'powerful'], ['foo', 'very good']]);
});

test('side effects', t => {
    const magnanimousProp = new MetaProperty<number>('magnanimous', 0);
    const peripateticProp = new MetaProperty<number>('peripatetic', 0)
        .addDependency(magnanimousProp, 2, (value, input) => value ? input * 2 : input);
    const salubriousProp = new MetaProperty<number>('salubrious', 0)
        .addSideEffect(peripateticProp, 1, (value, input) => value + input);
    const zygomorphicProp = new MetaProperty<number>('zygomorphic', 0)
        .addDependency(peripateticProp, 1, (value, input) => value * 1000 + input);

    const [magnanimous, peripatetic, salubrious, zygomorphic] = 
        [magnanimousProp, peripateticProp, salubriousProp, zygomorphicProp].map(prop => {
            function inner(value: number) {
                return prop.getDecorator(value);
            }
            inner.get = function(obj: object | Constructor, key?: string | symbol) {
                return new MetaPropReader(obj).get(prop, key);
            }
            return inner;
        });

    class A {
        @magnanimous(1) @peripatetic(1)
        a = 'a';
        @magnanimous(1) @salubrious(1)
        b = 'b';
        @zygomorphic(1)
        c = 'c';
    }
    t.is(magnanimous.get(A, 'a'), 1);       // explicit
    t.is(magnanimous.get(A, 'b'), 1);       // explicit
    t.is(magnanimous.get(A, 'c'), 0);       // default
    t.is(peripatetic.get(A, 'a'), 1);       // explicit
    t.is(peripatetic.get(A, 'b'), 2);       // implicit: salubrious 1 -> peripatetic 1, then magnanimous 1 -> peripatetic 2
    t.is(peripatetic.get(A, 'c'), 0);       // default
    t.is(salubrious.get(A, 'a'), 0);        // default
    t.is(salubrious.get(A, 'b'), 1);        // explicit
    t.is(salubrious.get(A, 'c'), 0);        // default
    t.is(zygomorphic.get(A, 'a'), 1000);    // implicit: peripatetic 1 -> zygomorphic 1000
    t.is(zygomorphic.get(A, 'b'), 2000);    // implicit: peripatetic 2 -> zygomorphic 2000
    t.is(zygomorphic.get(A, 'c'), 1);       // explicit
});