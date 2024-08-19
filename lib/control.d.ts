import { MetaProperty } from "./meta-props.js";
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
export declare const controlProp: MetaProperty<ControlConfig>;
export declare function control(controlFactory: ((id: string) => HTMLElement | DocumentFragment) | ControlConfig): {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export {};
