import { Constructor } from "./meta-props.js";
declare const getChildHtmlTag: unique symbol;
declare const getAriaLabelledBy: unique symbol;
export declare class Component<T extends object | object[] = any> {
    ctor: Constructor<T>;
    data: T;
    id: string;
    context?: {
        [k: string]: any;
    };
    html: HTMLElement;
    private content;
    private header?;
    private arialabelIds?;
    static idPrefix: string;
    private static idIncr;
    childIdIncr: number;
    constructor(data: T, ctor?: Constructor<T>, context?: {
        [k: string]: any;
    });
    refresh(): void;
    private getContentStructure;
    private getHtml;
    [getChildHtmlTag](level: number): "" | "tbody" | "tr" | "div";
    [getAriaLabelledBy](colIdx: number): string;
}
export {};
