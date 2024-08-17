import { Type, typeProp } from "./type.js";
import { MetaProperty, MetaPropReader } from "./meta-props.js";

export type Control = {
    html: DocumentFragment;
    element: HTMLElement;
    reportValidity(): boolean;
    setCustomValidity(error: string): void;
    getValue(): any;
    setValue(value: any): void;
    addEventListener: HTMLElement['addEventListener'];
};


type ControlConfig = {
    createControl(id: string, labels: HTMLLabelElement | string): Control;
    min?: number;
    max?: number;
    step?: number;
    list?: any[];
};

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLSelectElement;
const formControlTags = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'];

function wrapControlFactory(controlFactory: (id: string) => HTMLElement | DocumentFragment) {
    return function(this: ControlConfig, id: string, labels: HTMLLabelElement | string): Control {
        let html = controlFactory(id);
        let element: HTMLElement | undefined;
        if (!('getElementById' in html)) {
            element = html;
            const frag = new DocumentFragment();
            frag.appendChild(html);
            html = frag;
        }
        let withId = html.getElementById(id);
        if (!withId) {
            if (!element) throw new Error(`Control factory produced HTML without required element ID '${id}'.`);
            element.id = id;
            withId = element;
        }
        if (!formControlTags.includes(withId.tagName)) {
            throw new Error('Control factory did not produce a valid form element, or the form element was not found.');
        }
        const control = withId as FormControl;
        let getValue = () => control.value as any;
        let setValue = (value: any) => { control.value = `${value}` };
        switch (control.type) {
            case 'checkbox':
            case 'radio':
                getValue = () => (control as HTMLInputElement).checked;
                setValue = (value: any) => (control as HTMLInputElement).checked = Boolean(value);
                break;
            case 'number':
                if (this.min) (control as HTMLInputElement).min = `${this.min}`;
                if (this.max) (control as HTMLInputElement).max = `${this.max}`;
                (control as HTMLInputElement).step = `${this.step ?? 'any'}`;
                break;
        }
        if (control.type === 'checkbox' || control.type === 'radio') {
            getValue = () => (control as HTMLInputElement).checked;
            setValue = (value: any) => (control as HTMLInputElement).checked = Boolean(value);
        }
        if (this.list?.length) {
            const list = document.createElement('datalist');
            const listId = list.id = `${id}-datalist`;
            list.innerHTML = this.list.map(val => `<option value="${val}"></option>`).join('');
            html.append(list);
            control.setAttribute('list', listId);
        }
        if (typeof labels === 'string') {
            control.setAttribute('aria-labelledby', labels);
        } else if (control.type === 'checkbox' || control.type === 'radio') {
            labels.prepend(html);
            html.replaceChildren(labels);
        } else {
            html.prepend(labels);
        }
        return {
            html,
            element: control,
            getValue,
            setValue,
            reportValidity: control.reportValidity.bind(control),
            setCustomValidity: control.setCustomValidity.bind(control),
            addEventListener: control.addEventListener.bind(control),
        };
    }
}

export const controlProp = new MetaProperty<ControlConfig>('control', {
        createControl: wrapControlFactory(() => document.createElement('input'))
    })
    .addDependency(typeProp, 0, (type, config) => {
        switch (type) {
            case Number:
            case BigInt:
                return {
                    createControl: wrapControlFactory(() => {
                        const input = document.createElement('input');
                        input.type = 'number';
                        return input;
                    })
                };
            case Boolean:
                return {
                    createControl: wrapControlFactory(() => {
                        const input = document.createElement('input');
                        input.type = 'checkbox';
                        return input;
                    })
                };
            default:
                return config;
        }
    });

export function control(controlFactory: ((id: string) => HTMLElement | DocumentFragment) | ControlConfig) {
    if (typeof controlFactory === 'object') {
        return controlProp.getDecorator(controlFactory);
    }
    return controlProp.getDecorator({
        createControl: wrapControlFactory(controlFactory),
    });
}
