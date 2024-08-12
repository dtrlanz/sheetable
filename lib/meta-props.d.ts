type SideEffect<T> = {
    precedence: number;
    callback: (getValue: <U>(metaProp: MetaProperty<U>) => U, input: T) => T;
};
export declare class MetaProperty<T> {
    description: string;
    defaultValue: T;
    affectedBy: SideEffect<T>[];
    constructor(desciption: string, defaultValue: T);
    addSideEffect<U>(metaProp: MetaProperty<U>, precedence: number, callback: (value: T, input: U) => U): MetaProperty<T>;
    getDecorator(value: T): {
        (_target: any, context: DecoratorContext): void;
        where(condition: MetaPropCondition): (_target: any, context: DecoratorContext) => void;
    };
}
export declare class MetaPropReader {
    private ctor;
    context: {
        [k: string]: any;
    };
    cache: Map<string | symbol | undefined, Map<MetaProperty<any>, any>>;
    constructor(obj: object | Constructor, context?: {
        [k: string]: any;
    });
    get<T>(metaProp: MetaProperty<T>, key?: string | symbol): T;
    /**
     * Returns key-value pairs of class members for which this meta property has a value
     *
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of key-value pairs
     */
    entries<T>(metaProp: MetaProperty<T>): [(string | symbol), T][];
    list<T>(metaProp: MetaProperty<T>): (string | symbol)[];
}
export type Constructor<T = object> = new (...args: any[]) => T;
type MetaPropCondition = (context: {
    [k: string]: any;
}) => boolean;
export {};
