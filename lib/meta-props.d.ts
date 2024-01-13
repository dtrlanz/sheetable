export declare class MetaProperty<T> {
    key: symbol;
    constructor(desciption?: string);
    getDecorator(value: T): {
        (_target: any, context: DecoratorContext): void;
        where(condition: MetaPropCondition): (_target: any, context: DecoratorContext) => void;
    };
    getReader(context?: {
        [k: string]: any;
    }): MetaPropReader<T>;
}
declare class MetaPropReader<T> {
    metaPropKey: symbol;
    context: {
        [k: string]: any;
    };
    constructor(metaPropKey: symbol, context: {
        [k: string]: any;
    });
    private getData;
    /**
     * Returns value of this meta property for a given class or class members
     *
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @param [key] - property key; if omitted, returns value applied by class decorator
     * @returns value or undefined
     */
    get(obj: object | Constructor, key?: string | symbol): T | undefined;
    /**
     * Returns key-value pairs of class members for which this meta property has a value
     *
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of key-value pairs
     */
    entries(obj: object | Constructor): [(string | symbol), T][];
    /**
     * Returns keys of class members for which this meta property has a truthy value
     *
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of keys
     */
    list(obj: object | Constructor): (string | symbol)[];
}
export type Constructor<T = object> = new (...args: any[]) => T;
type MetaPropCondition = (context: {
    [k: string]: any;
}) => boolean;
export {};
