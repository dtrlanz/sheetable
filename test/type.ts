import test from 'ava';
import { type, getPropConstructor, createFromEntries } from "../src/type.js";

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