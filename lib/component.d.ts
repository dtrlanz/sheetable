import { Constructor } from "./meta-props.js";
export declare class Component<T extends object | object[] = any> {
    ctor: Constructor<T>;
    data: T;
    id: string;
    context?: {
        [k: string]: any;
    };
    html: HTMLElement;
    private children;
    private header?;
    static idPrefix: string;
    static classNamePrefix: string;
    private static idIncr;
    childIdIncr: number;
    constructor(data: T, ctor?: Constructor<T>, context?: {
        [k: string]: any;
    });
}
