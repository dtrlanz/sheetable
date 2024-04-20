import { Constructor } from "./meta-props.js";
export declare class Component<T extends object | object[] = any> {
    ctor: Constructor<T>;
    data: T;
    id: string;
    private children;
    private header?;
    static idPrefix: string;
    private static idIncr;
    private childIdIncr;
    constructor(data: T, ctor?: Constructor<T>, context?: {
        [k: string]: any;
    });
    private flatMap;
    private deepMap;
}
