import { MetaProperty, Constructor } from "./meta-props.js";
export type Type = Constructor | typeof String | typeof Number | typeof BigInt | typeof Boolean | typeof Symbol | typeof Date | Type[];
export declare const typeProp: MetaProperty<Type | undefined>;
export declare function type(t: Type): {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare function getPropType(obj: object | Constructor, key: string | symbol, context?: {
    [k: string]: any;
}): Type | undefined;
/**
 * Gets the constructor for the specified property, if it is an object type. Returns undefined if
 * the specified property is primitive or non-existent.
 * @param obj - the parent object or its constructor
 * @param key - the property key
 * @param context - context object for filtering decorators
 * @returns Constructor | undefined - the constructor function for the specified property
 */
export declare function getPropConstructor(obj: object | Constructor, key: string | symbol, context?: {
    [k: string]: any;
}): Constructor | undefined;
export declare const parseProp: MetaProperty<((str: string) => any) | undefined>;
export declare function parse(parser: (str: string) => any): {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare const stringifyProp: MetaProperty<(val: any) => string>;
export declare function stringify(stringifier: (val: any) => string): {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare const validateProp: MetaProperty<((val: any) => string) | undefined>;
export declare function validate(validation: (val: any) => string): {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare function convertToEntries(obj: object): [string | symbol | number, any][];
export declare function convertToEntriesRecursively(obj: object): [(string | symbol | number)[], any][];
export declare function createFromEntries<T>(ctor: Constructor<T>, entries: [string | symbol, any][]): T | undefined;
export declare function createRecursively<T extends object>(ctor: Constructor<T> | undefined, entries: [(string | symbol | number)[], any][], context?: {
    [k: string]: any;
} | undefined): T | T[] | undefined;
export declare function flattenEntries(ctor: Constructor | undefined, entries: [(string | symbol | number)[], any][], context?: {
    [k: string]: any;
} | undefined): Iterable<[string | symbol | number, any]>;
