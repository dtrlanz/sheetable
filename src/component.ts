import { Constructor } from "./meta-props.js";
import { getKeysWithTitles, title } from "./title.js";


type Child = {
    key: string | symbol | number,
    comp: Component,
} | {
    key: string | symbol | number,
    elem: HTMLElement,
};

export class Component<T extends object | object[] = any> {
    ctor: Constructor<T>;
    data: T;
    id: string;
    private children: (UiGroup | UiField)[];
    private header?: string[][];

    static idPrefix = 'cmp';
    private static idIncr = 0;
    private childIdIncr = 0;

    constructor(data: T, ctor?: Constructor<T>, context?: { [k: string]: any; }) {
        this.id = `${Component.idPrefix}${(Component.idIncr++).toString(16)}`;
        this.data = data;
        let sample;
        if (ctor) {
            this.ctor = ctor;
            sample = Array.isArray(data)
                ? (data[0] ?? new this.ctor())
                : data;
        } else {
            if (Array.isArray(data)) {
                if (!data.length) {
                    throw new Error('When passing an empty array, a constructor is required as the second argument.');
                }
                sample = data[0];
            } else {
                sample = data;
            }
            this.ctor = Object.getPrototypeOf(sample).constructor;
        }
        let structure = getKeysWithTitles(sample, context);
        if (Array.isArray(data)) {
            this.header = structure.map(([_, title]) => title);
            const rowIds: string[] = [];
            for (let i = 0; i < data.length; i++) {
                rowIds.push((this.childIdIncr++).toString());
            }
            structure = structure.flatMap(([key, title]) => {
                return rowIds.map((rowId, idx) =>
                    [[idx, ...key], [rowId, ...title]]
                ) satisfies typeof structure;
            });
        }
        this.children = constructChildren(this, this.id, structure);
    }

    private flatMap<T>(callbackFn: (field: UiField) => T): T[] {
        return this.children.flatMap(item => item.flatMap(callbackFn));
    }

    private deepMap<T>(mapFieldFn: (field: UiField) => T, mapGroupFn: (items: T[], group: UiGroup) => T): T[] {
        return this.children.map(item => item.deepMap(mapFieldFn, mapGroupFn));
    }
}

function constructChildren(
    comp: Component, 
    parentId: string, 
    children: [key: (string | number | symbol)[], title: string[]][],
    level = 0,
) {
    const map = new Map<string, UiField | [key: (string | number | symbol)[], title: string[]][]>();
    for (const [key, title] of children) {
        if (title.length === 1) {
            const field = new UiField(comp, parentId, title[0], key);
            map.set(title[0], field);
        } else if (title.length > 1) {
            const arr = map.get(title[0])
            if (arr) {
                if (!Array.isArray(arr)) throw new Error(`internal error: inconsistent title array length\ntitle: ${title}`);
                arr.push([key, title.splice(1)]);
            } else {
                map.set(title[0], [[key, title.splice(1)]]);
            }
    
        }
    }
    const result: (UiGroup | UiField)[] = [];
    for (const [title, item] of map) {
        if (Array.isArray(item)) {
            result.push(new UiGroup(comp, parentId, level, title, item));
        } else {
            result.push(item);
        }
    }
    return result;
}


class UiGroup {
    comp: Component;
    id: string;
    level: number;
    title: string;
    children: (UiGroup | UiField)[];

    constructor(comp: Component, parentId: string, level: number, title: string, children: [key: (string | number | symbol)[], title: string[]][]) {
        this.comp = comp;
        this.id = `${parentId}-${title}`;
        this.level = level;
        this.title = title;
        this.children = constructChildren(comp, parentId, children, level + 1);
    }

    flatMap<T>(callbackFn: (field: UiField) => T): T[] {
        return this.children.flatMap(item => item.flatMap(callbackFn));
    }

    deepMap<T>(mapFieldFn: (field: UiField) => T, mapGroupFn: (items: T[], group: UiGroup) => T): T {
        return mapGroupFn(this.children.map(item => item.deepMap(mapFieldFn, mapGroupFn)), this);
    }
}

class UiField {
    comp: Component;
    id: string;
    title: string;
    keyTuple: (string | symbol | number)[];

    constructor(comp: Component, parentId: string, title: string, keyTuple: (string | symbol | number)[]) {
        this.comp = comp;
        this.id = `${parentId}-${title}`;
        this.title = title;
        this.keyTuple = keyTuple;
    }

    flatMap<T>(callbackFn: (field: UiField) => T): T {
        return callbackFn(this);
    }

    deepMap<T>(mapFieldFn: (field: UiField) => T, _mapGroupFn: any): T {
        return mapFieldFn(this);
    }

    #label?: HTMLLabelElement;
    get label(): HTMLLabelElement {
        if (!this.#label) {
            this.#label = document.createElement('label');
            this.#label.htmlFor = this.id;
            this.#label.innerText = this.title;
        }
        return this.#label;
    }
}



