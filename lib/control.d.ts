import { Type } from "./type.js";
export type Control = HTMLElement & {
    reportValidity(): boolean;
    setCustomValidity(error: string): void;
    value: string;
};
export declare function createControl(id: string, ariaLabelledBy?: string, type?: Type): Control;
