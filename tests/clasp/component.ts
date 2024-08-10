import { test } from "./app/test";
import { Component } from "../../src/component";
import { title } from "../../src/title";
import { type } from "../../src/type";

test('show component', async t => {
    class A {
        @title('Foo') @type(Number)
        foo = 3.14;

        @title('Bar') @type(String)
        bar = "Hello, World!";
    }

    class B {
        @title('Apples')
        a = new A();

        @title('Oranges') @type(Number)
        b = 42;
    }

    const arr = [new B(), new B()]
    const comp = new Component(arr);

    const ui = document.getElementById('ui')!;
    ui.replaceChildren(comp.html);

    const btnAdd = document.createElement('button');
    btnAdd.innerText = "Add row";
    let count = 0;
    btnAdd.addEventListener('click', () => {
        const obj = new B();
        obj.a.foo = 3.14 * count;
        obj.a.bar = 'The quick brown fox jumps over the lazy dog.'.substring(0, count);
        obj.b = count;
        arr.push(obj);
        comp.refresh();
        count++;
    });
    const btnLog = document.createElement('button');
    btnLog.innerText = "Log data";
    btnLog.addEventListener('click', () => {
        console.log(arr);
    })
    ui.append(btnAdd, btnLog);
})
