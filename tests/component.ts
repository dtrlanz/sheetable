import test from 'ava';
import { title, spread, rest, getKeysWithTitles } from "../src/title.js";
import { Component } from "../src/component.js";

type UiStructure = ({
    title: string;
    children: UiStructure;
} | {
    title: string;
    keyTuple: (string | symbol | number)[];
})[];

// extract only relevant information to simplify `deepEqual` comparisons
function getUiStructure(children: UiStructure): UiStructure {
    return children.map(child => {
        const title = child.title;
        if ('children' in child) {
            return { title, children: getUiStructure(child.children) };
        } else {
            return { title, keyTuple: child.keyTuple };
        }
    });
}

test('simple object structure', t => {
    class A {
        @title('Foo')
        foo = 3.14;

        @title('Bar')
        bar = false;
    }

    let objA = new A();
    let comp: Component<any> = new Component(objA);
    t.deepEqual(getUiStructure(comp['children']), [
        {
            title: 'Foo',
            keyTuple: ['foo'],
        },
        {
            title: 'Bar',
            keyTuple: ['bar'],
        },
    ]);

    class B {
        @title('Apples')
        a = objA;

        @title('Oranges')
        b = 42;
    }

    const objB = new B();
    comp = new Component(objB);
    t.deepEqual(getUiStructure(comp['children']), [
        {
            title: 'Apples',
            children: [
                {
                    title: 'Foo',
                    keyTuple: ['a', 'foo'],
                },
                {
                    title: 'Bar',
                    keyTuple: ['a', 'bar'],
                },        
            ]
        },
        {
            title: 'Oranges',
            keyTuple: ['b'],
        }
    ]);
});

test('array of objects', t => {
    class A {
        @title('Foo')
        foo = 3.14;

        @title('Bar')
        bar = false;
    }

    let objA = new A();
    let comp: Component<any> = new Component([objA, objA]);
    let rowTitles = [...new Set(comp['children'].map(c => c.title))];
    t.deepEqual(getUiStructure(comp['children']), [
        {
            title: rowTitles[0],
            children: [
                {
                    title: 'Foo',
                    keyTuple: [0, 'foo'],
                },
                {
                    title: 'Bar',
                    keyTuple: [0, 'bar'],
                },        
            ]
        },
        {
            title: rowTitles[1],
            children: [
                {
                    title: 'Foo',
                    keyTuple: [1, 'foo'],
                },
                {
                    title: 'Bar',
                    keyTuple: [1, 'bar'],
                },        
            ]
        },
    ]);

    t.deepEqual(comp['header'], [
        ['Foo'],
        ['Bar'],
    ]);

    class B {
        @title('Apples')
        a = objA;

        @title('Oranges')
        b = 42;
    }

    const objB = new B();
    comp = new Component([objB, objB]);
    rowTitles = [...new Set(comp['children'].map(c => c.title))];
    t.deepEqual(getUiStructure(comp['children']), [
        {
            title: rowTitles[0],
            children: [
                {
                    title: 'Apples',
                    children: [
                        {
                            title: 'Foo',
                            keyTuple: [0, 'a', 'foo'],
                        },
                        {
                            title: 'Bar',
                            keyTuple: [0, 'a', 'bar'],
                        },        
                    ]
                },
                {
                    title: 'Oranges',
                    keyTuple: [0, 'b'],
                },        
            ]
        },
        {
            title: rowTitles[1],
            children: [
                {
                    title: 'Apples',
                    children: [
                        {
                            title: 'Foo',
                            keyTuple: [1, 'a', 'foo'],
                        },
                        {
                            title: 'Bar',
                            keyTuple: [1, 'a', 'bar'],
                        },        
                    ]
                },
                {
                    title: 'Oranges',
                    keyTuple: [1, 'b'],
                },        
            ]
        },
    ]);

    t.deepEqual(comp['header'], [
        ['Apples', 'Foo'],
        ['Apples', 'Bar'],
        ['Oranges'],
    ]);

});
