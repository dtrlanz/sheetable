// NB: This file is not (yet) compiled by build.js.
// To compile manually: `tsc component.ts --target es2022 --module esnext --noResolve`

import { test } from "./app/test";
import { Component } from "../../src/component";
import { title } from "../../src/title";


test('show component', async t => {
    class A {
        @title('Foo')
        foo = 3.14;

        @title('Bar')
        bar = "Hello, World!";
    }

    class B {
        @title('Apples')
        a = new A();

        @title('Oranges')
        b = 42;
    }

    const obj = new B();
    const arr = [obj, obj]
    const comp = new Component(arr);

    const ui = document.getElementById('ui')!;
    ui.replaceChildren(comp.html);

    const btn = document.createElement('button');
    ui.appendChild(btn);
    btn.innerText = "Add row";
    let count = 0;
    btn.addEventListener('click', () => {
        const obj = new B();
        obj.a.foo = 3.14 * count;
        obj.a.bar = 'The quick brown fox jumps over the lazy dog.'.substring(0, count);
        obj.b = count;
        arr.push(obj);
        comp.refresh();
        count++;
    })
})
