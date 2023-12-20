import { Header } from "./headers.js";
import { Constructor, MetaProperty } from "./meta-props.js";
import { getIndexTitles } from "./title.js";
import { Sendable } from "./values.js";

const indexProp = new MetaProperty('index');
export const index = indexProp.getDecorator(true);

export class Index<T extends object> {
    constructor(
        ctor: Constructor<T>, 
        header: Header<T>, 
        data: {
            rows: Sendable[][],
            colNumbers: number[],
            rowOffset: number,
        }, 
        context?: { readonly [k: string]: any }
    ) {
        const indexTitles = getIndexTitles(ctor, context);
        const entryStructure: [key: (string | symbol | number)[], colIdx: number][] = [];
        for (const title of indexTitles) {
            const columns = header.getColumnsForTitle([title]);
            for (const col of columns) {
                const keyTuple = header.getKeyForColumns(col);
                if (!keyTuple) continue;
                const colIdx = data.colNumbers.findIndex(n => n === col);
                entryStructure.push([keyTuple, colIdx]);
            }
        }
        throw new Error('new Index() not yet implemented');
    }
}

export function getIndexKeys(ctor: Constructor, context?: { readonly [k: string]: any }): (string | symbol)[] {
    return indexProp.getReader(context).list(ctor);
}
