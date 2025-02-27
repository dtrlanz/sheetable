import { Constructor, MetaPropReader, MetaProperty } from "./meta-props.js";
import { getKeysWithLabels, label } from "./label.js";
import { validateProp, stringifyProp, parseProp } from "./type.js";
import { Control, controlProp } from "./control.js";

type Child = {
    key: string | symbol | number,
    comp: Component,
} | {
    key: string | symbol | number,
    elem: HTMLElement,
};

type ControlElement = HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement |
    HTMLMeterElement | HTMLOutputElement | HTMLProgressElement;

const getChildHtmlTag: unique symbol = Symbol('getChildHtmlTag');
const getAriaLabelledBy: unique symbol = Symbol('getAriaLabelledBy');


export class Component<T extends object | object[] = any> {
    ctor: Constructor<T>;
    data: T;
    id: string;
    context?: { [k: string]: any; };
    html: HTMLElement;
    //private children: (UiGroup | UiField)[];
    private content: UiGroup;
    private header?: { id: string, text: string }[][];
    private arialabelIds?: string[];

    static idPrefix = 'cmp';
    private static idIncr = 0;
    childIdIncr = 0;

    constructor(data: T, ctor?: Constructor<T>, context?: { [k: string]: any; }) {
        this.id = `${Component.idPrefix}${(Component.idIncr++).toString(16)}`;
        this.data = data;
        this.context = context;

        if (ctor) {
            this.ctor = ctor;



        } else {
            let sample;
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

    private getContentStructure() {
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
        const rowTitles = new Array<string>(this.data.length);
        const tableStructure = new Array<typeof structure[0]>(structure.length * this.data.length);
        for (let i = 0; i < this.data.length; i++) {
            const rowTitle = `Row ${i + 1}`;
            for (let j = 0; j < structure.length; j++) {
                const [key, title] = structure[j];
                tableStructure[i * structure.length + j] = [[i, ...key], [rowTitle, ...title]];
            }
        }
        return tableStructure;
    }
        
    private getHtml() {
        if (this.header) {
            const tHead = document.createElement('thead');
            const headerDepth = this.header.reduce((d, item) => Math.max(d, item.length), 0);
            for (let row = 0; row < headerDepth; row++) {
                const tr = document.createElement('tr');
                tr.append(...this.header.map((col) => {
                    const th = document.createElement('th');
                    const id =  col[row]?.id;
                    if (id) th.setAttribute('id', id);
                    th.innerText = col[row]?.text ?? '';
                    return th;
                }));
                tHead.appendChild(tr);
            }
            const table = document.createElement('table');
            table.append(tHead, this.content.html as HTMLTableSectionElement);
            return table;
        } else {
            return this.content.html as HTMLElement;
        }
    }

    // module-internal method for getting HTML element tag at a given depth
    [getChildHtmlTag](level: number) {
        if (this.header) {
            switch (level) {
                case 0: return 'tbody';
                case 1: return 'tr';
                default: return '';
            }
        } else {
            return 'div';
        }
    }

    // module-internal method for getting HTML IDs of elements labeling a given table column
    [getAriaLabelledBy](colIdx: number) {
        return this.arialabelIds?.[colIdx] ?? '';
    }
}

class UiGroup {
    comp: Component;
    level: number;
    title: string;
    children: (UiGroup | UiField)[] = [];
    childrenByTitle?: Map<string, UiGroup | UiField>;
    html: HTMLElement | HTMLElement[] = [];

    constructor(
        comp: Component, 
        level: number, 
        title: string, 
        children: [key: (string | number | symbol)[], title: string[]][],
        colIter?: Iterator<number>,
    ) {
        this.comp = comp;
        this.level = level;
        this.title = title;
        this.updateStructure(children, colIter);
    }

    updateStructure(children: [key: (string | number | symbol)[], title: string[]][], colIter?: Iterator<number>) {
        const tag = this.comp[getChildHtmlTag](this.level);
        switch (tag) {
            case '':
                this.html = [];
                break;
            case 'tr':
                colIter = (function*() {
                    for (let colIdx = 0; ; colIdx++) {
                        yield colIdx;
                    }
                })();
            default:
                this.html = document.createElement(tag);
                if (this.title) this.html.dataset.title = this.title;
        }

        type FieldOrGroup = ['field', key: (string | number | symbol)[]]
            | ['group', children: [key: (string | number | symbol)[], title: string[]][]];
        const map = new Map<string, FieldOrGroup>();

        for (const [key, title] of children) {
            if (title.length === 1) {
                if (map.has(title[0])) throw new Error(`internal error: duplicate field\ntitle: ${title}`);
                map.set(title[0], ['field', key]);
            } else if (title.length > 1) {
                if (!map.has(title[0])) {
                    map.set(title[0], ['group', [[key, title.splice(1)]]]);
                    continue;
                }
                const group = map.get(title[0])!;
                if (group[0] !== 'group') throw new Error(`internal error: inconsistent title array length\ntitle: ${title}`);
                group[1].push([key, title.splice(1)]);
            }
        }

        this.children = [];
        for (const [title, item] of map) {
            const existing  = this.childrenByTitle?.get(title);
            if (existing) {
                if ('children' in existing && item[0] === 'group') {
                    existing.updateStructure(item[1], colIter);
                    this.children.push(existing);
                    continue;
                } else if (!('children' in existing) && item[0] === 'field') {
                    existing.updateStructure(item[1], colIter);
                    this.children.push(existing);
                    continue;
                }
            }
            if (item[0] === 'group') {
                this.children.push(new UiGroup(this.comp, this.level + 1, title, item[1], colIter));
            } else {
                this.children.push(new UiField(this.comp, title, item[1], colIter));
            }
        }
        
        this.childrenByTitle = new Map();
        const childElems: HTMLElement[] = [];
        for (const child of this.children) {
            this.childrenByTitle.set(child.title, child);
            if (Array.isArray(child.html)) {
                childElems.push(...child.html);
            } else if (child.html) {
                childElems.push(child.html);
            }
        }
        if (Array.isArray(this.html)) {
            this.html = childElems;
        } else {
            this.html.replaceChildren(...childElems);
        }
    }
}

class UiField {
    comp: Component;
    id: string;
    title: string;
    colIdx?: number;
    dataObject: any;
    dataKey: string | symbol | number = '';
    html?: HTMLElement[];
    // @ts-ignore Property 'getMP' has no initializer and is not definitely assigned in the constructor. ts(2564)
    private getMP: <T>(metaProp: MetaProperty<T>) => T;
    private setValue?: (value: any) => void;

    constructor(comp: Component, title: string, keyTuple: (string | symbol | number)[], colIter?: Iterator<number>) {
        this.comp = comp;
        this.id = `${comp.id}-${(comp.childIdIncr++).toString(16)}`;
        this.title = title;
        this.updateStructure(keyTuple, colIter);
    }

    updateStructure(keyTuple: (string | symbol | number)[], colIter?: Iterator<number>) {
        if (!keyTuple.length) throw new Error('internal error: `keyTuple` must have at least one element');
        let deepestProp: [obj: any, key: string | symbol] | undefined;
        let obj: any = this.comp;
        let key: string | symbol | number = 'data';
        let keyStr = '';
        for (let i = 0; i < keyTuple.length; i++) {
            obj = obj[key] ?? {};
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
        if (!deepestProp) throw new Error('internal error: `keyTuple` must not contain only numbers');
        this.dataObject = obj;
        this.dataKey = key;
        keyStr = keyStr.substring(1);
        this.colIdx = colIter?.next().value;
        this.getMP = <T>(metaProp: MetaProperty<T>) => {
            return new MetaPropReader(deepestProp![0], this.comp.context).get(metaProp, deepestProp![1]);
        } 

        let control: Control;
        let html: DocumentFragment;
        if (this.colIdx != undefined) {
            const ariaLabelledBy = this.comp[getAriaLabelledBy](this.colIdx);
            control = this.getMP(controlProp).createControl(this.id, ariaLabelledBy);
            const td = document.createElement('td');
            td.append(control.html);
            html = new DocumentFragment();
            html.append(td);
        } else {
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
        this.setValue = function(value: string) {
            control.setValue(value);
        };
        this.updateValue();
        // replace old HTML with new
        const htmlArr = Array.from(html.children) as HTMLElement[]
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



