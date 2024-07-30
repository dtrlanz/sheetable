import { Constructor } from "./meta-props.js";
import { getKeysWithTitles, title } from "./title.js";
import { getPropConfig, PropConfig } from "./type.js";


type Child = {
    key: string | symbol | number,
    comp: Component,
} | {
    key: string | symbol | number,
    elem: HTMLElement,
};

type ControlElement = HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement |
    HTMLMeterElement | HTMLOutputElement | HTMLProgressElement;

export class Component<T extends object | object[] = any> {
    ctor: Constructor<T>;
    data: T;
    id: string;
    context?: { [k: string]: any; };
    html: HTMLElement;
    private children: (UiGroup | UiField)[] = [];
    private header?: string[][];

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
        this.html = this.makeHtml();
    }

    refresh() {
        const html = this.makeHtml();
        this.html.replaceWith(html);
        this.html = html;
    }

    private makeHtml() {
        const sample = Array.isArray(this.data)
            ? (this.data[0] ?? new this.ctor())
            : this.data;
        let structure = getKeysWithTitles(sample, this.context);
        if (Array.isArray(this.data)) {
            this.header = structure.map(([_, title]) => title);
            const rowIds: string[] = [];
            for (let i = 0; i < this.data.length; i++) {
                rowIds.push((this.childIdIncr++).toString());
            }
            structure = structure.flatMap(([key, title]) => {
                return rowIds.map((rowId, idx) =>
                    [[idx, ...key], [rowId, ...title]]
                ) satisfies typeof structure;
            });
        }
        this.children = constructChildren(this, structure);

        if (!this.header) {
            const outerDiv = document.createElement('div');
            traverse(
                this.children,
                outerDiv,
                (group, parentDiv) => {
                    const div = document.createElement('div');
                    div.dataset.title = group.title;
                    return parentDiv.appendChild(div);
                },
                (field, parentDiv) => {
                    const fieldHtml = field.getHtml();
                    parentDiv.append(...fieldHtml);
                },
            );
            return outerDiv;
        } else {
            const table = document.createElement('table');
            table.innerHTML = '<thead></thead><tbody></tbody>';
            const arialabelIds = new Array(this.header.length);
            for (let row = 0; row < this.header[0].length; row++) {
                const tr = document.createElement('tr');
                tr.append(...this.header.map((col, idx) => {
                    const th = document.createElement('th');
                    const id = `${this.id}-${(this.childIdIncr++).toString(16)}`;
                    arialabelIds[idx] = arialabelIds[idx] 
                        ? `${arialabelIds[idx]} ${id}`
                        : id;
                    th.setAttribute('id', id);
                    th.innerText = col[row] ?? '';
                    return th;
                }));
                table.tHead!.appendChild(tr);
            }
            let colIdx = 0;
            traverse<HTMLTableSectionElement | HTMLTableRowElement>(
                this.children,
                table.tBodies[0],
                (group, parent) => {
                    if (parent.tagName === 'TBODY') {
                        colIdx = 0;
                        return parent.appendChild(document.createElement('tr'));
                    } else {
                        return parent;
                    }
                },
                (field, parent) => {
                    const td = document.createElement('td');
                    const fieldHtml = field.getHtml(arialabelIds[colIdx++]);
                    td.append(...fieldHtml);
                    parent.appendChild(td);
                },
            )
            return table;
        }
    }
}

function constructChildren(
    comp: Component, 
    children: [key: (string | number | symbol)[], title: string[]][],
    level = 0,
) {
    const map = new Map<string, UiField | [key: (string | number | symbol)[], title: string[]][]>();
    for (const [key, title] of children) {
        if (title.length === 1) {
            const field = new UiField(comp, title[0], key);
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
            result.push(new UiGroup(comp, level, title, item));
        } else {
            result.push(item);
        }
    }
    return result;
}

function traverse<C>(
    children: (UiGroup | UiField)[],
    initialContext: C,
    onGroup: (group: UiGroup, context: C) => C, 
    onField: (field: UiField, context: C) => void,
): void {
    for (let idx = 0; idx < children.length; idx++) {
        const child = children[idx];
        if ('children' in child) {
            const context = onGroup(child, initialContext);
            traverse(child.children, context, onGroup, onField);
        } else {
            onField(child, initialContext);
        }
    }
}

class UiGroup {
    comp: Component;
    level: number;
    title: string;
    children: (UiGroup | UiField)[];

    constructor(comp: Component, level: number, title: string, children: [key: (string | number | symbol)[], title: string[]][]) {
        this.comp = comp;
        this.level = level;
        this.title = title;
        this.children = constructChildren(comp, children, level + 1);
    }

}

class UiField {
    comp: Component;
    id: string;
    title: string;
    dataParent: any;
    dataKey: string | symbol;
    keyStr: string;
    propConfig: PropConfig;

    constructor(comp: Component, title: string, keyTuple: (string | symbol | number)[]) {
        this.comp = comp;
        this.id = `${comp.id}-${(comp.childIdIncr++).toString(16)}`;
        this.title = title;

        let obj = this.comp.data;
        let i = 0
        let keyStr = '';
        for (; i < keyTuple.length - 1; i++) {
            const k = keyTuple[i];
            obj = obj[k];
            keyStr += `-${String(k)}`;
        }
        const lastKey = keyTuple[i];
        if (typeof lastKey === 'number') {
            throw new Error('Form controls corresponding to items in an array not yet implemented.')
        }
        keyStr += `-${String(lastKey)}`;
        this.keyStr = keyStr.substring(1);
        this.dataParent = obj;
        this.dataKey = lastKey;
        this.propConfig = getPropConfig(this.dataParent, this.dataKey, this.comp.context);
    }

    getHtml(ariaLabelledBy?: string): HTMLElement[] {
        this.refresh();
        if (!ariaLabelledBy) return [this.label, this.control];
        this.control.setAttribute('aria-labelledby', ariaLabelledBy);
        return [this.control];
    }

    refresh() {
        const val = this.dataParent[this.dataKey];
        const str = this.propConfig.stringify(val);
        this.control.value = str;
    }

    #control?: ControlElement;
    get control(): ControlElement {
        if (!this.#control) {
            this.#control = this.makeControl();
        }
        return this.#control;
    }

    private makeControl(): ControlElement {
        const control = document.createElement('input');
        control.setAttribute('id', this.id);
        control.setAttribute('type', 'text');
        control.dataset.title = this.title;
        control.dataset.keys = this.keyStr;
        control.addEventListener('change', () => {
            const val = this.propConfig.parse(control.value);
            const validError = this.propConfig.validate(val) ?? '';
            control.setCustomValidity(validError);
            control.reportValidity();
            if (!validError) {
                this.dataParent[this.dataKey] = val;
            }
        })
        return control;
    }

    #label?: HTMLLabelElement;
    get label(): HTMLLabelElement {
        if (!this.#label) {
            this.#label = document.createElement('label');
            this.#label.htmlFor = this.id;
            this.#label.textContent = this.title;
            this.#label.dataset.title = this.title;
            this.#label.dataset.keys = this.keyStr;
        }
        return this.#label;
    }
}



