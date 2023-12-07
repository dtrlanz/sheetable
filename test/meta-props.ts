import test from 'ava';
import { MetaProperty } from "../src/meta-props.js";

test('simple meta props', t => {
    const palatableProp = new MetaProperty('palatable');
    const palatable = palatableProp.getDecorator('🍕');
    let pReader = palatableProp.getReader();

    const laudableProp = new MetaProperty('laudable');
    function laudable(value: string) {
        return laudableProp.getDecorator(value);
    }
    let lReader = laudableProp.getReader();

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
    t.deepEqual(pReader.entries(ClassA), [['bar', '🍕']])

    t.is(lReader.get(ClassA), undefined);
    t.is(lReader.get(ClassA, 'foo'), 'very good');
    t.is(lReader.get(ClassA, 'bar'), 'brilliant');
    // accessor decorator runs before field decorator
    t.deepEqual(lReader.entries(ClassA), [['bar', 'brilliant'], ['foo', 'very good']])

    // retrieve meta prop via object
    const objA = new ClassA();
    t.is(pReader.get(objA), '🍕');
    t.is(pReader.get(objA, 'foo'), undefined);
    t.is(pReader.get(objA, 'bar'), '🍕');
    t.deepEqual(pReader.entries(objA), [['bar', '🍕']])

    t.is(lReader.get(objA), undefined);
    t.is(lReader.get(objA, 'foo'), 'very good');
    t.is(lReader.get(objA, 'bar'), 'brilliant');
    t.deepEqual(lReader.entries(objA), [['bar', 'brilliant'], ['foo', 'very good']])

    // subclass inherits meta props
    class ClassB extends ClassA {}

    t.is(pReader.get(ClassB), '🍕');
    t.is(pReader.get(ClassB, 'foo'), undefined);
    t.is(pReader.get(ClassB, 'bar'), '🍕');
    t.deepEqual(pReader.entries(ClassB), [['bar', '🍕']])

    t.is(lReader.get(ClassB), undefined);
    t.is(lReader.get(ClassB, 'foo'), 'very good');
    t.is(lReader.get(ClassB, 'bar'), 'brilliant');
    t.deepEqual(lReader.entries(ClassB), [['bar', 'brilliant'], ['foo', 'very good']])

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
    t.deepEqual(pReader.entries(ClassC), [['bar', '🍕'], ['foo', '🍕'], ['baz', '🍕']])

    t.is(lReader.get(ClassC), 'magnificent');
    t.is(lReader.get(ClassC, 'foo'), 'not bad');
    t.is(lReader.get(ClassC, 'bar'), 'brilliant');
    t.is(lReader.get(ClassC, 'baz'), undefined);
    t.deepEqual(lReader.entries(ClassC), [['bar', 'brilliant'], ['foo', 'not bad']])

    // superclass meta props are unchanged
    t.is(pReader.get(ClassA), '🍕');
    t.is(pReader.get(ClassA, 'foo'), undefined);
    t.is(pReader.get(ClassA, 'bar'), '🍕');
    t.deepEqual(pReader.entries(ClassA), [['bar', '🍕']])

    t.is(lReader.get(ClassA), undefined);
    t.is(lReader.get(ClassA, 'foo'), 'very good');
    t.is(lReader.get(ClassA, 'bar'), 'brilliant');
    t.deepEqual(lReader.entries(ClassA), [['bar', 'brilliant'], ['foo', 'very good']])

    t.is(pReader.get(ClassB), '🍕');
    t.is(pReader.get(ClassB, 'foo'), undefined);
    t.is(pReader.get(ClassB, 'bar'), '🍕');
    t.deepEqual(pReader.entries(ClassB), [['bar', '🍕']])

    t.is(lReader.get(ClassB), undefined);
    t.is(lReader.get(ClassB, 'foo'), 'very good');
    t.is(lReader.get(ClassB, 'bar'), 'brilliant');
    t.deepEqual(lReader.entries(ClassB), [['bar', 'brilliant'], ['foo', 'very good']])

});

test('conditional meta props', t => {
    const laudableProp = new MetaProperty('laudable');
    function laudable(value: string) {
        return laudableProp.getDecorator(value);
    }
    const normal = laudableProp.getReader();
    const sunny = laudableProp.getReader({ weather: 'sunny' });
    const rainy = laudableProp.getReader({ weather: 'rainy' });
    const stormy = laudableProp.getReader({ weather: 'stormy' });

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