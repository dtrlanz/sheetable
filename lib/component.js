import { MetaPropReader } from "./meta-props.js";
import { getKeysWithLabels } from "./label.js";
import { validateProp, stringifyProp, parseProp } from "./type.js";
import { controlProp } from "./control.js";
const getChildHtmlTag = Symbol('getChildHtmlTag');
const getAriaLabelledBy = Symbol('getAriaLabelledBy');
export class Component {
    ctor;
    data;
    id;
    context;
    html;
    //private children: (UiGroup | UiField)[];
    content;
    header;
    arialabelIds;
    static idPrefix = 'cmp';
    static idIncr = 0;
    childIdIncr = 0;
    constructor(data, ctor, context) {
        this.id = `${Component.idPrefix}${(Component.idIncr++).toString(16)}`;
        this.data = data;
        this.context = context;
        if (ctor) {
            this.ctor = ctor;
        }
        else {
            let sample;
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
        let structure = this.getContentStructure();
        this.content = new UiGroup(this, 0, '', structure);
        this.html = this.getHtml();
    }
    refresh() {
        let structure = this.getContentStructure();
        this.content.updateStructure(structure);
        const html = this.getHtml();
        this.html.replaceWith(html);
        this.html = html;
    }
    getContentStructure() {
        const sample = Array.isArray(this.data)
            ? (this.data[0] ?? new this.ctor())
            : this.data;
        const structure = getKeysWithLabels(sample, this.context);
        if (!Array.isArray(this.data)) {
            // only one record of data, so we're done
            return structure;
        }
        // array of records, so generate table structure
        // generate table header structure
        this.header = structure.map(([_, titleArr]) => titleArr.map(title => ({
            id: `${this.id}-${(this.childIdIncr++).toString(16)}`,
            text: title,
        })));
        this.arialabelIds = this.header.map(col => col.map(({ id }) => id).join(' '));
        // generate table body structure (with given number of rows/records)
        const rowTitles = new Array(this.data.length);
        const tableStructure = new Array(structure.length * this.data.length);
        for (let i = 0; i < this.data.length; i++) {
            const rowTitle = `Row ${i + 1}`;
            for (let j = 0; j < structure.length; j++) {
                const [key, title] = structure[j];
                tableStructure[i * structure.length + j] = [[i, ...key], [rowTitle, ...title]];
            }
        }
        return tableStructure;
    }
    getHtml() {
        if (this.header) {
            const tHead = document.createElement('thead');
            for (let row = 0; row < this.header[0].length; row++) {
                const tr = document.createElement('tr');
                tr.append(...this.header.map((col, idx) => {
                    const th = document.createElement('th');
                    const id = `${this.id}-${(this.childIdIncr++).toString(16)}`;
                    th.setAttribute('id', id);
                    th.innerText = col[row]?.text ?? '';
                    return th;
                }));
                tHead.appendChild(tr);
            }
            const table = document.createElement('table');
            table.append(tHead, this.content.html);
            return table;
        }
        else {
            return this.content.html;
        }
    }
    // module-internal method for getting HTML element tag at a given depth
    [getChildHtmlTag](level) {
        if (this.header) {
            switch (level) {
                case 0: return 'tbody';
                case 1: return 'tr';
                default: return '';
            }
        }
        else {
            return 'div';
        }
    }
    // module-internal method for getting HTML IDs of elements labeling a given table column
    [getAriaLabelledBy](colIdx) {
        return this.arialabelIds?.[colIdx] ?? '';
    }
}
class UiGroup {
    comp;
    level;
    title;
    children = [];
    childrenByTitle;
    html = [];
    constructor(comp, level, title, children, colIter) {
        this.comp = comp;
        this.level = level;
        this.title = title;
        this.updateStructure(children, colIter);
    }
    updateStructure(children, colIter) {
        const tag = this.comp[getChildHtmlTag](this.level);
        switch (tag) {
            case '':
                this.html = [];
                break;
            case 'tr':
                colIter = (function* () {
                    for (let colIdx = 0;; colIdx++) {
                        yield colIdx;
                    }
                })();
            default:
                this.html = document.createElement(tag);
                if (this.title)
                    this.html.dataset.title = this.title;
        }
        const map = new Map();
        for (const [key, title] of children) {
            if (title.length === 1) {
                if (map.has(title[0]))
                    throw new Error(`internal error: duplicate field\ntitle: ${title}`);
                map.set(title[0], ['field', key]);
            }
            else if (title.length > 1) {
                if (!map.has(title[0])) {
                    map.set(title[0], ['group', [[key, title.splice(1)]]]);
                    continue;
                }
                const group = map.get(title[0]);
                if (group[0] !== 'group')
                    throw new Error(`internal error: inconsistent title array length\ntitle: ${title}`);
                group[1].push([key, title.splice(1)]);
            }
        }
        this.children = [];
        for (const [title, item] of map) {
            const existing = this.childrenByTitle?.get(title);
            if (existing) {
                if ('children' in existing && item[0] === 'group') {
                    existing.updateStructure(item[1], colIter);
                    this.children.push(existing);
                    continue;
                }
                else if (!('children' in existing) && item[0] === 'field') {
                    existing.updateStructure(item[1], colIter);
                    this.children.push(existing);
                    continue;
                }
            }
            if (item[0] === 'group') {
                this.children.push(new UiGroup(this.comp, this.level + 1, title, item[1], colIter));
            }
            else {
                this.children.push(new UiField(this.comp, title, item[1], colIter));
            }
        }
        this.childrenByTitle = new Map();
        const childElems = [];
        for (const child of this.children) {
            this.childrenByTitle.set(child.title, child);
            if (Array.isArray(child.html)) {
                childElems.push(...child.html);
            }
            else if (child.html) {
                childElems.push(child.html);
            }
        }
        if (Array.isArray(this.html)) {
            this.html = childElems;
        }
        else {
            this.html.replaceChildren(...childElems);
        }
    }
}
class UiField {
    comp;
    id;
    title;
    colIdx;
    dataObject;
    dataKey = '';
    html;
    // @ts-ignore Property 'getMP' has no initializer and is not definitely assigned in the constructor. ts(2564)
    getMP;
    setValue;
    constructor(comp, title, keyTuple, colIter) {
        this.comp = comp;
        this.id = `${comp.id}-${(comp.childIdIncr++).toString(16)}`;
        this.title = title;
        this.updateStructure(keyTuple, colIter);
    }
    updateStructure(keyTuple, colIter) {
        if (!keyTuple.length)
            throw new Error('internal error: `keyTuple` must have at least one element');
        let deepestProp;
        let obj = this.comp;
        let key = 'data';
        let keyStr = '';
        for (let i = 0; i < keyTuple.length; i++) {
            obj = obj[key];
            key = keyTuple[i];
            // Assemble string representation of key tuple. (This is not used by sheetable but 
            // may be used by the app.)
            keyStr += `-${String(key)}`;
            // Track the last key that is not a number so that we can access the most deeply 
            // nested object property.
            if (typeof key !== 'number') {
                deepestProp = [obj, key];
            }
        }
        if (!deepestProp)
            throw new Error('internal error: `keyTuple` must not contain only numbers');
        this.dataObject = obj;
        this.dataKey = key;
        keyStr = keyStr.substring(1);
        this.colIdx = colIter?.next().value;
        this.getMP = (metaProp) => {
            return new MetaPropReader(deepestProp[0], this.comp.context).get(metaProp, deepestProp[1]);
        };
        let control;
        let html;
        if (this.colIdx != undefined) {
            const ariaLabelledBy = this.comp[getAriaLabelledBy](this.colIdx);
            control = this.getMP(controlProp).createControl(this.id, ariaLabelledBy);
            const td = document.createElement('td');
            td.append(control.html);
            html = new DocumentFragment();
            html.append(td);
        }
        else {
            const label = document.createElement('label');
            label.htmlFor = this.id;
            label.textContent = this.title;
            label.dataset.title = this.title;
            label.dataset.keys = keyStr;
            control = this.getMP(controlProp).createControl(this.id, label);
            html = control.html;
        }
        control.element.dataset.title = this.title;
        control.element.dataset.keys = keyStr;
        control.addEventListener('change', () => {
            let val = control.getValue();
            const parse = this.getMP(parseProp);
            if (parse && typeof val === 'string') {
                val = parse(val);
            }
            const validError = this.getMP(validateProp)?.(val) ?? '';
            control.setCustomValidity(validError);
            control.reportValidity();
            if (!validError) {
                this.dataObject[this.dataKey] = val;
            }
        });
        this.setValue = function (value) {
            control.setValue(value);
        };
        this.updateValue();
        // replace old HTML with new
        const htmlArr = Array.from(html.children);
        if (!this.html?.length) {
            this.html = Array.from(htmlArr);
            return;
        }
        this.html[0].replaceWith(...htmlArr);
        for (let i = 1; i < this.html.length; i++) {
            this.html[i].remove();
        }
        this.html = htmlArr;
    }
    updateValue() {
        const val = this.dataObject[this.dataKey];
        const strVal = this.getMP(stringifyProp)(val);
        this.setValue?.(strVal);
    }
}
