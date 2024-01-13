// Symbol.metadata polyfill
Symbol.metadata ??= Symbol("Symbol.metadata");
export class MetaProperty {
    key;
    constructor(desciption) {
        this.key = Symbol(desciption);
    }
    getDecorator(value) {
        const metaPropkey = this.key;
        function decorator(_target, context) {
            updateMetadata(context, value);
        }
        decorator.where = function (condition) {
            return function (_target, context) {
                updateMetadata(context, value, condition);
            };
        };
        return decorator;
        function updateMetadata({ metadata, name, kind }, value, condition) {
            let map = metadata[metaPropkey];
            if (!Object.hasOwn(metadata, metaPropkey)) {
                // inherit from superclass metadata
                const entries = [...map ?? []].map(([name, data]) => [name, {
                        default: data.default,
                        // clone to avoid modifying superclass metadata
                        conditional: [...data.conditional],
                        kind: data.kind,
                    }]);
                metadata[metaPropkey] = map = new Map(entries);
                map;
            }
            if (kind === 'class') {
                // store all class decorator value under `undefined` to distinguish them from 
                // member decorator values
                name = undefined;
            }
            let entry = map.get(name);
            if (!entry) {
                map.set(name, entry = {
                    conditional: [],
                    kind: kind,
                });
            }
            if (condition) {
                entry.conditional.push({ value, condition });
            }
            else {
                entry.default = value;
            }
        }
    }
    getReader(context = {}) {
        return new MetaPropReader(this.key, context);
    }
}
class MetaPropReader {
    metaPropKey;
    context;
    constructor(metaPropKey, context) {
        this.metaPropKey = metaPropKey;
        this.context = context;
    }
    getData(obj) {
        const ctor = typeof obj === 'function' ? obj : Object.getPrototypeOf(obj).constructor;
        return ctor[Symbol.metadata]?.[this.metaPropKey];
    }
    /**
     * Returns value of this meta property for a given class or class members
     *
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @param [key] - property key; if omitted, returns value applied by class decorator
     * @returns value or undefined
     */
    get(obj, key) {
        const map = this.getData(obj);
        const record = map?.get(key);
        if (!record)
            return undefined;
        for (const { condition, value } of record.conditional) {
            if (condition(this.context))
                return value;
        }
        return record.default;
    }
    /**
     * Returns key-value pairs of class members for which this meta property has a value
     *
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of key-value pairs
     */
    entries(obj) {
        const arr = [];
        for (const [key, record] of this.getData(obj) ?? []) {
            if (key === undefined)
                continue;
            let val = record.default;
            for (const { condition, value } of record.conditional) {
                if (condition(this.context)) {
                    val = value;
                }
            }
            if (val !== undefined)
                arr.push([key, val]);
        }
        return arr;
    }
    /**
     * Returns keys of class members for which this meta property has a truthy value
     *
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of keys
     */
    list(obj) {
        return this.entries(obj)
            .filter(([_, v]) => v)
            .map(([k]) => k);
    }
}
