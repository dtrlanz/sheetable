import test from 'ava';
import { type, getPropConstructor, createFromEntries, createRecursively } from "../lib/type.js";
import { title } from '../lib/title.js';

test('from entries', t => {
    // without static factory method
    class A {
        foo = 1;
        bar = 2;
    }

    const a0 = createFromEntries(A, []);
    t.assert(a0 instanceof A);
    t.is(a0?.foo, 1);
    t.is(a0?.bar, 2);
    const a1 = createFromEntries(A, [['foo', 3], ['bar', 4]]);
    t.assert(a1 instanceof A);
    t.is(a1?.foo, 3);
    t.is(a1?.bar, 4);

    // with static factory method
    class B {
        foo = 1;
        bar = 2;

        static fromEntries(entries: [string, any][]): B {
            const obj = new B();
            const map = new Map(entries);
            const foo = map.get('foo');
            if (typeof foo === 'number') obj.foo = foo * 2; // double to show factory was used
            const bar = map.get('bar');
            if (typeof bar === 'number') obj.bar = bar * 2;
            return obj;
        }
    }

    const b0 = createFromEntries(B, []);
    t.assert(b0 instanceof B);
    t.is(b0?.foo, 1);
    t.is(b0?.bar, 2);
    const b1 = createFromEntries(B, [['foo', 3], ['bar', 4]]);
    t.assert(b1 instanceof B);
    t.is(b1?.foo, 6);
    t.is(b1?.bar, 8);
});

test('get property constructor', t => {
    class A {}
    class B {}

    class C {
        foo = new A();
        bar = new B();
    }
    t.is(getPropConstructor(C, 'foo'), A);
    t.is(getPropConstructor(C, 'bar'), B);
    const c = new C();
    t.is(getPropConstructor(c, 'foo'), A);
    t.is(getPropConstructor(c, 'bar'), B);

    class D {
        @type(A)
        foo?: A;

        @type(B)
        bar?: B;
    }
    t.is(getPropConstructor(D, 'foo'), A);
    t.is(getPropConstructor(D, 'bar'), B);
    const d = new D();
    t.is(getPropConstructor(d, 'foo'), A);
    t.is(getPropConstructor(d, 'bar'), B);

    class E {
        @type(A)
        foo: A | number = 1;

        @type(B)    // @type decorator prioritized over init value
        bar: A | B = new A();
    }
    t.is(getPropConstructor(E, 'foo'), A);
    t.is(getPropConstructor(E, 'bar'), B);
    const e = new E();
    t.is(getPropConstructor(e, 'foo'), A);
    t.is(getPropConstructor(e, 'bar'), B, 'should prioritize @type value');
});

test('create nested objects recursively', t => {
    class A {
        a = 1;
        b = 2;
    }
    class B {
        x = 3;
        y = 4;
    }
    // depth 1
    const obj0 = createRecursively(A, [
        [['a'], 10],
        [['b'], 20],
    ]);
    t.deepEqual(obj0, Object.setPrototypeOf({ a: 10, b: 20 }, A.prototype));

    class C {
        foo = new A();
        bar = new B();
    }
    // depth 2
    const obj1 = createRecursively(C, [
        [['foo', 'a'], 10],
        [['foo', 'b'], 20],
        [['bar', 'x'], 30],
        [['bar', 'y'], 40],
    ]);
    t.deepEqual(obj1, Object.setPrototypeOf({
        foo: Object.setPrototypeOf({ a: 10, b: 20}, A.prototype),
        bar: Object.setPrototypeOf({ x: 30, y: 40}, B.prototype),
    }, C.prototype));

    class D {
        foo = new A();
        bar = [new B(), new B()];
    }
    // setting one property to an array
    const obj2 = createRecursively(D, [
        [['foo', 'a'], 10],
        [['foo', 'b'], 20],
        [['bar', 0, 'x'], 30],
        [['bar', 0, 'y'], 40],
        [['bar', 1, 'x'], 50],
        [['bar', 1, 'y'], 60],
    ]);
    t.deepEqual(obj2, Object.setPrototypeOf({
        foo: Object.setPrototypeOf({ a: 10, b: 20}, A.prototype),
        bar: [
            Object.setPrototypeOf({ x: 30, y: 40}, B.prototype), 
            Object.setPrototypeOf({ x: 50, y: 60}, B.prototype)
        ],
    }, D.prototype));

    const sym = Symbol('sym');
    class E {
        foo = new A();
        bar = ['apples', 'bananas'];
        [sym] = 'zygomorphic';
    }
    // using symbol as property key; mixing different depths
    const obj3 = createRecursively(E, [
        [['foo', 'a'], 10],
        [['foo', 'b'], 20],
        [['bar', 0], 'oranges'],
        [['bar', 1], 'pears'],
        [['bar', 2], 'carrots'],
        [[sym], 'stupendous'],
    ]);
    t.deepEqual(obj3, Object.setPrototypeOf({
        foo: Object.setPrototypeOf({ a: 10, b: 20}, A.prototype),
        bar: ['oranges', 'pears', 'carrots'],
        [sym]: 'stupendous',
    }, E.prototype));

    // using `Object` instead of a class
    const obj4 = createRecursively(Object, [
        [['foo', 'a'], 10],
        [['foo', 'b'], 20],
        [['bar', 0], 'oranges'],
        [['bar', 1], 'pears'],
        [['bar', 2], 'carrots'],
        [[sym], 'stupendous'],
    ]);
    t.deepEqual(obj4, {
        foo: { a: 10, b: 20},
        bar: ['oranges', 'pears', 'carrots'],
        [sym]: 'stupendous',
    });
});
