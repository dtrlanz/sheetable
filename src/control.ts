import { Type } from "./type.js";

export type Control = HTMLElement & {
    reportValidity(): boolean;
    setCustomValidity(error: string): void;
    value: string;
};

export function createControl(id: string, ariaLabelledBy?: string, type?: Type): Control {
    const control = document.createElement('input');
    control.setAttribute('id', id);
    if (ariaLabelledBy) {
        control.setAttribute('aria-labelledby', ariaLabelledBy);
    }
    if (type === Number || type === BigInt) {
        control.setAttribute('type', 'number');
        control.setAttribute('step', 'any');
    } else {
        control.setAttribute('type', 'text');
    }
    return control;
}