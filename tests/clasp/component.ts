import { test } from "./app/test";
import { Component } from "../../src/component";
import { title } from "../../src/title";
import { type } from "../../src/type";

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

    @title('Bananas')
    c = true;
}

test('show basic component', async t => {
    const obj = new B();
    const comp = new Component(obj);

    const ui = document.getElementById('ui')!;
    ui.replaceChildren(comp.html);

    const btnLog = document.createElement('button');
    btnLog.innerText = "Log data";
    btnLog.addEventListener('click', () => {
        console.log(obj);
    })
    ui.append(btnLog);
})

test('show table component', async t => {
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
