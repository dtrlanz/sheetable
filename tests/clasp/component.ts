// NB: This file is not (yet) compiled by build.js.
// To compile manually: `tsc component.ts --target es2022 --module esnext --noResolve`

import { test } from "./app/test";
import { SpreadsheetClient } from "../../src/client";
import { Component } from "../../src/component";
import { title } from "../../src/title";


test('show component', async t => {
    class A {
        @title('Foo')
        foo = 3.14;

        @title('Bar')
        bar = false;
    }

    class B {
        @title('Apples')
        a = new A();

        @title('Oranges')
        b = 42;
    }

    const obj = new B();
    const comp = new Component(obj);

    const ui = document.getElementById('ui')!;
    ui.replaceChildren(comp.html);
})
