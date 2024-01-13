import { Constructor } from "./meta-props.js";
type Type = 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | Constructor;
export declare function type(t: Type): {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
export declare function getPropConstructor(obj: object | Constructor, key: string | symbol, context?: {
    [k: string]: any;
}): Constructor | undefined;
export declare function createFromEntries<T>(ctor: Constructor<T>, entries: [string | symbol, any][]): T | undefined;
export declare function createRecursively<T extends object>(ctor: Constructor<T> | undefined, entries: [(string | symbol | number)[], any][], context?: {
    [k: string]: any;
} | undefined): T | T[] | undefined;
export declare function flattenEntries(ctor: Constructor | undefined, entries: [(string | symbol | number)[], any][], context?: {
    [k: string]: any;
} | undefined): Iterable<[string | symbol | number, any]>;
export {};
