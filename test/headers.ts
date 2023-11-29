import test from 'ava';
import { sheet } from "./util/sheet-navigation.js";

import { Branch, getHeadersHelper } from '../src/headers.js';
import { Region, TableWalker } from "../src/sheet-navigation.js";



test('find header branches', t => {
    const w = new TableWalker(Region.fromSheet(sheet`
        Title                 | Author 1   |              | Date
                              | First Name | Last Name    | Year
        To Kill A Mockingbird | Harper     | Lee          | 1960 | comment
        Don Quixote           | Miguel     | de Cervantes | 1605
        Jane Eyre             | Charlotte  | Brontë       | 1847
        The Great Gatsby      | F. Scott   | Fitzgerald   | 1925
    `));
    const { branches, rowStop } = getHeadersHelper(w);
    t.is(rowStop, 3);
    t.deepEqual(branches, [
        br('Title', 1, 1, 2),
        br('Author 1', 1, 2, 4,
            br('First Name', 2, 2, 3),
            br('Last Name', 2, 3, 4)),
        br('Date', 1, 4, 5,
            br('Year', 2, 4, 5))
    ]);
});

function br(label: string, row: number, start: number, stop: number, ...children: Branch[]) {
    return { label, row, start, stop, children };
}