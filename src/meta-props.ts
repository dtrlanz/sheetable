// Symbol.metadata polyfill
(Symbol as any).metadata ??= Symbol("Symbol.metadata");

export class MetaProperty<T> {
    key: symbol;

    constructor(desciption?: string) {
        this.key = Symbol(desciption);
    }

    getDecorator(value: T) {
        const metaPropkey = this.key;
        function decorator(_target: any, context: DecoratorContext): void {
            updateMetadata(context, value);
        }
        decorator.where = function(condition: MetaPropCondition) {
            return function(_target: any, context: DecoratorContext): void {
                updateMetadata(context, value, condition);
            }
        }
        return decorator;

        function updateMetadata({ metadata, name, kind }: DecoratorContext, value: T, condition?: MetaPropCondition) {
            let map = metadata[metaPropkey] as Map<String | symbol | undefined, MetaPropRecord<T>> | undefined;
            if (!Object.hasOwn(metadata, metaPropkey)) {
                // inherit from superclass metadata
                const entries = [...map ?? []].map(([name, data]) => [name, {
                    default: data.default,
                    // clone to avoid modifying superclass metadata
                    conditional: [...data.conditional],
                    kind: data.kind,
                }] as [String | symbol | undefined, MetaPropRecord<T>]);
                metadata[metaPropkey] = map = new Map(entries);
                map;
            }
            if (kind === 'class') {
                // store all class decorator value under `undefined` to distinguish them from 
                // member decorator values
                name = undefined;
            }
            let entry = map!.get(name);
            if (!entry) {
                map!.set(name, entry = {
                    conditional: [],
                    kind: kind,
                });
            }
            if (condition) {
                entry.conditional.push({ value, condition });
            } else {
                entry.default = value;
            }
        }        
    }

    getReader(context: { [k: string]: any } = {}): MetaPropReader<T> {
        return new MetaPropReader(this.key, context);
    }
}

class MetaPropReader<T> {
    metaPropKey: symbol;
    context: { [k: string]: any };
    
    constructor(metaPropKey: symbol, context: { [k: string]: any }) {
        this.metaPropKey = metaPropKey;
        this.context = context;
    }

    private getData(obj: object | Constructor): Map<String | symbol | undefined, MetaPropRecord<T>> | undefined {
        const ctor = typeof obj === 'function' ? obj : Object.getPrototypeOf(obj).constructor;
        return ctor[Symbol.metadata][this.metaPropKey];
    }

    /**
     * Returns value of this meta property for a given class or class members
     * 
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @param [key] - property key; if omitted, returns value applied by class decorator
     * @returns value or undefined
     */
    get(obj: object | Constructor, key?: string | symbol): T | undefined {
        const map = this.getData(obj);
        const record = map?.get(key);
        if (!record) return undefined;
        for (const { condition, value } of record.conditional) {
            if (condition(this.context)) return value;
        }
        return record.default;
    }

    /**
     * Returns key-value pairs of class members for which this meta property has a value
     * 
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of key-value pairs
     */
    entries(obj: object | Constructor): [(string | symbol), T][] {
        const arr = [];
        for (const [key, record] of this.getData(obj) ?? []) {
            if (key === undefined) continue;
            let val = record.default;
            for (const { condition, value } of record.conditional) {
                if (condition(this.context)) {
                    val = value
                }
            }
            if (val !== undefined) arr.push([key, val] as [(string | symbol), T]);
        }
        return arr;
    }

    /**
     * Returns keys of class members for which this meta property has a truthy value
     * 
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of keys
     */
    list(obj: object | Constructor): (string | symbol)[] {
        return this.entries(obj)
            .filter(([_, v]) => v)
            .map(([k]) => k);
    }
}

export type Constructor = new (...args: any[]) => any;

type MetaPropCondition = (context: { [k: string]: any }) => boolean;

type MetaPropRecord<T> = {
    default?: T,
    conditional: ({
        condition: MetaPropCondition,
        value: T,
    })[],
    kind: DecoratorContext['kind'],
};


