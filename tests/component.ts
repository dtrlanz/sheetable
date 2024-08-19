import test from 'ava';
import { JSDOM } from 'jsdom';

import { label, spread, rest, getKeysWithLabels } from "../src/label.js";
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
        @label('Foo')
        foo = 3.14;

        @label('Bar')
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
        @label('Apples')
        a = objA;

        @label('Oranges')
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
        @label('Foo')
        foo = 3.14;

        @label('Bar')
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
        @label('Apples')
        a = objA;

        @label('Oranges')
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

function html2object(html: HTMLElement) {
    const obj: any = {
        tag: html.tagName.toLowerCase() as any,
        children: [],
    };
    // const attrMap = html.attributes;
    // for (let i = 0; i < attrMap.length; i++) {
    //     const attr = attrMap.item(i);
    //     if (attr) obj[attr.name] = attr.value;
    // }
    for (const child of html.childNodes) {
        if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
            obj.children.push(html2object(child as HTMLElement))
        } else if (child.nodeType === 3 /* Node.TEXT_NODE */) {
            obj.children.push(child.textContent)
        }
    }
    return obj;
}

test.only('simple UI component', t => {
    const dom = new JSDOM('');
    global.document = dom.window.document;
    global.DocumentFragment = dom.window.DocumentFragment;

    class A {
        @label('Foo')
        foo = 3.14;

        @label('Bar')
        bar = false;
    }

    class B {
        @label('Apples')
        a = new A();

        @label('Oranges')
        b = 42;
    }

    const obj = new B();
    const comp = new Component(obj);
    t.deepEqual(html2object(comp.html), {
        tag: 'div',
        children: [{
            tag: 'div',
            children: [{
                tag: 'label',
                children: ['Foo'],
            }, {
                tag: 'input',
                children: [],
            }, {
                tag: 'label',
                children: [{
                    tag: 'input',
                    children: [],
                }, 'Bar',
                ],
            }]
        }, {
            tag: 'label',
            children: ['Oranges'],
        }, {
            tag: 'input',
            children: [],
        }],
    });
});
