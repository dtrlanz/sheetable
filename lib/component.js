import { getKeysWithTitles } from "./title.js";
export class Component {
    ctor;
    data;
    id;
    children;
    header;
    static idPrefix = 'cmp';
    static idIncr = 0;
    childIdIncr = 0;
    constructor(data, ctor, context) {
        this.id = `${Component.idPrefix}${(Component.idIncr++).toString(16)}`;
        this.data = data;
        let obj;
        if (ctor) {
            this.ctor = ctor;
        }
        else {
            if (Array.isArray(data)) {
                if (!data.length) {
                    throw new Error('When passing an empty array, a constructor is required as the second argument.');
                }
                obj = data[0];
            }
            else {
                obj = data;
            }
            this.ctor = Object.getPrototypeOf(obj).constructor;
        }
        let structure = getKeysWithTitles(this.ctor, context);
        if (Array.isArray(data)) {
            this.header = structure.map(([_, title]) => title);
            const rowIds = [];
            for (let i = 0; i < data.length; i++) {
                rowIds.push((this.childIdIncr++).toString());
            }
            structure = structure.flatMap(([key, title]) => {
                return rowIds.map((rowId, idx) => [[idx, ...key], [rowId, ...title]]);
            });
        }
        this.children = constructChildren(this, this.id, structure);
    }
    flatMap(callbackFn) {
        return this.children.flatMap(item => item.flatMap(callbackFn));
    }
    deepMap(mapFieldFn, mapGroupFn) {
        return this.children.map(item => item.deepMap(mapFieldFn, mapGroupFn));
    }
}
function constructChildren(comp, parentId, children, level = 0) {
    const map = new Map();
    for (const [key, title] of children) {
        if (title.length === 1) {
            const field = new UiField(comp, parentId, title[0], key);
            map.set(title[0], field);
        }
        else if (title.length > 1) {
            const arr = map.get(title[0]);
            if (arr) {
                if (!Array.isArray(arr))
                    throw new Error(`internal error: inconsistent title array length\ntitle: ${title}`);
                arr.push([key, title.splice(1)]);
            }
            else {
                map.set(title[0], [[key, title.splice(1)]]);
            }
        }
    }
    const result = [];
    for (const [title, item] of map) {
        if (Array.isArray(item)) {
            result.push(new UiGroup(comp, parentId, level, title, item));
        }
        else {
            result.push(item);
        }
    }
    return result;
}
class UiGroup {
    comp;
    id;
    level;
    title;
    children;
    constructor(comp, parentId, level, title, children) {
        this.comp = comp;
        this.id = `${parentId}-${title}`;
        this.level = level;
        this.title = title;
        this.children = constructChildren(comp, parentId, children, level + 1);
    }
    flatMap(callbackFn) {
        return this.children.flatMap(item => item.flatMap(callbackFn));
    }
    deepMap(mapFieldFn, mapGroupFn) {
        return mapGroupFn(this.children.map(item => item.deepMap(mapFieldFn, mapGroupFn)), this);
    }
}
class UiField {
    comp;
    id;
    title;
    keyTuple;
    constructor(comp, parentId, title, keyTuple) {
        this.comp = comp;
        this.id = `${parentId}-${title}`;
        this.title = title;
        this.keyTuple = keyTuple;
    }
    flatMap(callbackFn) {
        return callbackFn(this);
    }
    deepMap(mapFieldFn, _mapGroupFn) {
        return mapFieldFn(this);
    }
    #label;
    get label() {
        if (!this.#label) {
            this.#label = document.createElement('label');
            this.#label.htmlFor = this.id;
            this.#label.innerText = this.title;
        }
        return this.#label;
    }
}
