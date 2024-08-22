import { MetaProperty, Constructor } from "./meta-props.js";
export declare const labelProp: MetaProperty<string | string[] | undefined>;
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
export declare function label(label: string, ...rest: string[]): {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare function getKeysWithLabels(obj: object, context?: {
    [k: string]: any;
}, includeRest?: boolean): [key: (string | symbol | number)[], label: string[]][];
export declare function getObjectPath(label: string[], obj: object | Constructor, context?: {
    [k: string]: any;
}, includeRest?: boolean): (string | symbol | number)[] | undefined;
export declare function getIndexLabels(ctor: Constructor, context?: {
    readonly [k: string]: any;
}): string[];
