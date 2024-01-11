import test from 'ava';
import { sheet } from "./util/sheet-navigation.js";

import { Header, Branch, getHeadersHelper } from '../lib/headers.js';
import { Region, TableWalker } from "../lib/sheet-navigation.js";
import { title } from "../lib/title.js";



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

test('read header', t => {
    class Person {
        @title('First Name')
        firstName = '';

        @title('Last Name')
        lastName = '';
    }
    class Book {
        @title('Title')
        title = '';

        @title('Author')
        author = new Person();

        @title('Year')
        year = 0;
    }

    const w0 = new TableWalker(Region.fromSheet(sheet`
        Title                 | Author     |              | Year
                              | First Name | Last Name    |
        To Kill A Mockingbird | Harper     | Lee          | 1960
        Don Quixote           | Miguel     | de Cervantes | 1605
        Jane Eyre             | Charlotte  | Brontë       | 1847
        The Great Gatsby      | F. Scott   | Fitzgerald   | 1925
    `));
    const h0 = Header.open(Book, getHeadersHelper(w0).branches);
    t.is(h0['firstRow'], 1);
    t.is(h0['rowCount'], 2);
    t.is(h0['firstCol'], 1);
    t.deepEqual(h0['columns'], [
        { titles: ['Title'], keys: ['title'] },
        { titles: ['Author', 'First Name'], keys: ['author', 'firstName'] },
        { titles: ['Author', 'Last Name'], keys: ['author', 'lastName'] },
        { titles: ['Year'], keys: ['year'] }
    ]);

    const w1 = new TableWalker(Region.fromSheet(sheet`
        Title                 | Author     |              || Year
                              | First Name | Last Name    ||
        To Kill A Mockingbird | Harper     | Lee          || 1960
        Don Quixote           | Miguel     | de Cervantes || 1605
        Jane Eyre             | Charlotte  | Brontë       || 1847
        The Great Gatsby      | F. Scott   | Fitzgerald   || 1925
    `));
    const h1 = Header.open(Book, getHeadersHelper(w1).branches);
    t.is(h1['firstRow'], 1);
    t.is(h1['rowCount'], 2);
    t.is(h1['firstCol'], 1);
    t.deepEqual(h1['columns'], [
        { titles: ['Title'], keys: ['title'] },
        { titles: ['Author', 'First Name'], keys: ['author', 'firstName'] },
        { titles: ['Author', 'Last Name'], keys: ['author', 'lastName'] },
        undefined,
        { titles: ['Year'], keys: ['year'] }
    ]);

    const w2 = new TableWalker(Region.fromSheet(sheet`
        ||                       |
        || Title                 | Author     |              | Year
        ||                       | First Name | Last Name    |
        || To Kill A Mockingbird | Harper     | Lee          | 1960
        || Don Quixote           | Miguel     | de Cervantes | 1605
        || Jane Eyre             | Charlotte  | Brontë       | 1847
        || The Great Gatsby      | F. Scott   | Fitzgerald   | 1925
    `), 2, 3);
    const h2 = Header.open(Book, getHeadersHelper(w2).branches);
    t.is(h2['firstRow'], 2);
    t.is(h2['rowCount'], 2);
    t.is(h2['firstCol'], 3);
    t.deepEqual(h2['columns'], [
        { titles: ['Title'], keys: ['title'] },
        { titles: ['Author', 'First Name'], keys: ['author', 'firstName'] },
        { titles: ['Author', 'Last Name'], keys: ['author', 'lastName'] },
        { titles: ['Year'], keys: ['year'] }
    ]);
});
