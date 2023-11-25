import test from 'ava';
import { MetaProperty } from "../src/meta-props.js";

test('meta props', t => {
    const p0 = MetaProperty.create('test 123');
    t.is(p0.description, 'test 123');
    
    // set and retrieve meta prop
    class ClassA {}
    const obj = new ClassA();
    t.is(p0.with(ClassA).get(), undefined, 'should be undefined by default');
    t.is(p0.with(obj).get(), undefined, 'should be undefined by default');
    p0.with(ClassA).set('foo');
    t.is(p0.with(ClassA).get(), 'foo', 'should retrieve value');
    t.is(p0.with(obj).get(), 'foo', 'should retrieve value');

    // cannot set value on instance (only on constructor)
    // @ts-ignore Property 'set' does not exist on type 'MetaPropertyReadonly'.ts(2339)
    t.throws(() => p0.with(obj).set('bar'), { instanceOf: TypeError}, 'cannot set value on instance');
    t.is(p0.with(obj).get(), 'foo', 'value unchanged');

    // flagged prop vs. unflagged prop
    const p1 = p0.flag('my-flag');
    t.is(p1.with(obj).get(), 'foo', 'use unflagged prop as fallback');
    p1.with(ClassA).set('bar');
    t.is(p0.with(obj).get(), 'foo', 'retrieve unflagged value');
    t.is(p1.with(obj).get(), 'bar', 'retrieve flagged value');
    const p2 = p1.flag('');
    t.is(p2.with(obj).get(), 'foo', 'empty string is equivalent to no flag');

    // every meta prop is distinct, regardless of description
    const p3 = MetaProperty.create('test 123');
    t.not(p0, p1, 'different meta props');
    t.is(p0.description, p3.description, 'though description is same');
    t.is(p3.with(obj).get(), undefined, 'should be undefined by default');
    p3.with(ClassA).set('bar');
    t.is(p0.with(obj).get(), 'foo', 'retrieve value from one prop');
    t.is(p3.with(obj).get(), 'bar', 'retrieve value from other prop');

    // instances of the same class share the same meta props,
    // instances of different classes have different meta props
    class ClassB {}
    const obj0 = new ClassA();
    const obj1 = new ClassB();
    const obj2 = {};
    t.is(p0.with(obj0).get(), 'foo', 'should retrieve value set earlier');
    t.is(p0.with(obj1).get(), undefined, 'should be undefined by default');
    t.is(p0.with(obj2).get(), undefined, 'should be undefined by default');
    p0.with(ClassB).set('foo bar');
    t.is(p0.with(obj0).get(), 'foo', 'should retrieve value');
    t.is(p0.with(obj1).get(), 'foo bar', 'should retrieve value');
    t.is(p0.with(obj2).get(), undefined, 'should be undefined by default');

    // with keys
    const key0 = 'x';
    const key1 = '';        // empty string !== no key
    const key2 = Symbol();
    t.is(p0.with(obj).get(), 'foo', 'should retrieve value');
    t.is(p0.with(obj, key0).get(), undefined, 'should be undefined by default');
    t.is(p0.with(obj, key1).get(), undefined, 'should be undefined by default');
    t.is(p0.with(obj, key2).get(), undefined, 'should be undefined by default');
    // @ts-ignore Property 'set' does not exist on type 'MetaPropertyReadonly'.ts(2339)
    t.throws(() => p0.with(obj, key0).set('bar'), { instanceOf: TypeError}, 'cannot set value on instance');
    p0.with(ClassA, key0).set(42);
    p0.with(ClassA, key1).set(3.14159);
    p0.with(ClassA, key2).set(true);
    t.is(p0.with(obj).get(), 'foo', 'should retrieve value');
    t.is(p0.with(obj, key0).get(), 42, 'should retrieve value');
    t.is(p0.with(obj, key1).get(), 3.14159, 'should retrieve value');
    t.is(p0.with(obj, key2).get(), true, 'should retrieve value');
});