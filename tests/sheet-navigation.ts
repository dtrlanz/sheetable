import test from 'ava';
import { sheet } from "./util/sheet-navigation.js";

import { Branch, getHeadersHelper } from '../src/headers.js';
import { Region, TableWalker } from "../src/sheet-navigation.js";

const region = Region.fromSheet(sheet`
    a | b | c | d
    e | f | g | h
    i | j | k | l
`);

test('region from sheet', t => {
    t.deepEqual(region.readAll(), [
        ['a', 'b', 'c', 'd'],
        ['e', 'f', 'g', 'h'],
        ['i', 'j', 'k', 'l'],
    ]);
});

test('resized region', t => {
    const r0 = region.resize(2, undefined, 2);
    t.deepEqual(r0.readAll(), [
        ['f', 'g', 'h'],
        ['j', 'k', 'l'],
    ]);
});

test('walker from region', t => {
    let walker: TableWalker | undefined = new TableWalker(region);
    t.is(walker.value, 'a');
    walker = walker.move(1, 2);
    t.is(walker?.value, 'g');
    walker = walker?.move(1, 1);
    t.is(walker?.value, 'l');
    walker = walker?.move(1, 1);
    t.is(walker?.value, undefined);
});

test('walker from resized region', t => {
    let walker: TableWalker | undefined = new TableWalker(region.resize(2, undefined, 2));
    t.is(walker.value, 'f');
    walker = walker.move(1, 2);
    t.is(walker?.value, 'l');
    walker = walker?.move(1, 1);
    t.is(walker?.value, undefined);
});