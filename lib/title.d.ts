import { Constructor } from "./meta-props.js";
export declare const spread: {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare const rest: {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare function title(title: string, ...rest: string[]): {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare function getKeysWithTitles(obj: object, context?: {
    [k: string]: any;
}, includeRest?: boolean): [key: (string | symbol | number)[], title: string[]][];
export declare function getObjectPath(title: string[], obj: object | Constructor, context?: {
    [k: string]: any;
}, includeRest?: boolean): (string | symbol | number)[] | undefined;
export declare function getIndexTitles(ctor: Constructor, context?: {
    readonly [k: string]: any;
}): string[];
