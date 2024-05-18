import { getKeysWithTitles } from "./title.js";
import { getPropConfig } from "./type.js";
export class Component {
    ctor;
    data;
    id;
    context;
    html;
    children;
    header;
    static idPrefix = 'cmp';
    static classNamePrefix = 'field';
    static idIncr = 0;
    childIdIncr = 0;
    constructor(data, ctor, context) {
        this.id = `${Component.idPrefix}${(Component.idIncr++).toString(16)}`;
        this.data = data;
        this.context = context;
        let sample;
        if (ctor) {
            this.ctor = ctor;
            sample = Array.isArray(data)
                ? (data[0] ?? new this.ctor())
                : data;
        }
        else {
            if (Array.isArray(data)) {
                if (!data.length) {
                    throw new Error('When passing an empty array, a constructor is required as the second argument.');
                }
                sample = data[0];
            }
            else {
                sample = data;
            }
            this.ctor = Object.getPrototypeOf(sample).constructor;
        }
        let structure = getKeysWithTitles(sample, context);
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
        this.children = constructChildren(this, structure);
        if (!this.header) {
            const outerDiv = document.createElement('div');
            traverse(this.children, outerDiv, (group, parentDiv) => {
                const div = document.createElement('div');
                return parentDiv.appendChild(div);
            }, (field, parentDiv) => {
                parentDiv.append(...field.getHtml(true));
            });
            this.html = outerDiv;
        }
        else {
            throw new Error('To do: implement HTML table generation');
        }
    }
}
function constructChildren(comp, children, level = 0) {
    const map = new Map();
    for (const [key, title] of children) {
        if (title.length === 1) {
            const field = new UiField(comp, title[0], key);
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
            result.push(new UiGroup(comp, level, title, item));
        }
        else {
            result.push(item);
        }
    }
    return result;
}
function traverse(children, initialContext, onGroup, onField) {
    for (const child of children) {
        if ('children' in child) {
            const context = onGroup(child, initialContext);
            traverse(child.children, context, onGroup, onField);
        }
        else {
            onField(child, initialContext);
        }
    }
}
class UiGroup {
    comp;
    level;
    title;
    children;
    constructor(comp, level, title, children) {
        this.comp = comp;
        this.level = level;
        this.title = title;
        this.children = constructChildren(comp, children, level + 1);
    }
}
class UiField {
    comp;
    id;
    title;
    dataParent;
    dataKey;
    className;
    propConfig;
    static classNamePrefix = 'field';
    constructor(comp, title, keyTuple) {
        this.comp = comp;
        this.id = `${comp.id}-${(comp.childIdIncr++).toString(16)}`;
        this.title = title;
        let obj = this.comp.data;
        let i = 0;
        let className = '';
        for (; i < keyTuple.length - 1; i++) {
            const k = keyTuple[i];
            obj = obj[k];
            className += `-${String(k)}`;
        }
        const lastKey = keyTuple[i];
        if (typeof lastKey === 'number') {
            throw new Error('Form controls corresponding to items in an array not yet implemented.');
        }
        className += typeof lastKey === 'symbol' ? '-' : `-${lastKey}`;
        this.className = UiField.classNamePrefix + className;
        this.dataParent = obj;
        this.dataKey = lastKey;
        this.propConfig = getPropConfig(this.dataParent, this.dataKey, this.comp.context);
    }
    getHtml(includeLabel) {
        this.refresh();
        if (includeLabel)
            return [this.label, this.control];
        return [this.control];
    }
    refresh() {
        const val = this.dataParent[this.dataKey];
        const str = this.propConfig.stringify(val);
        this.control.value = str;
    }
    #control;
    get control() {
        if (!this.#control) {
            this.#control = this.makeControl();
        }
        return this.#control;
    }
    makeControl() {
        const control = document.createElement('input');
        control.setAttribute('id', this.id);
        control.setAttribute('type', 'text');
        control.classList.add(this.className);
        return control;
    }
    #label;
    get label() {
        if (!this.#label) {
            this.#label = document.createElement('label');
            this.#label.htmlFor = this.id;
            this.#label.textContent = this.title;
            this.#label.classList.add(this.className);
        }
        return this.#label;
    }
}
