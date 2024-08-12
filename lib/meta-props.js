// Symbol.metadata polyfill
Symbol.metadata ??= Symbol('Symbol.metadata');
const metadataKey = Symbol('meta-properties');
export class MetaProperty {
    description;
    defaultValue;
    affectedBy = [];
    constructor(desciption, defaultValue) {
        this.description = desciption;
        this.defaultValue = defaultValue;
    }
    addSideEffect(metaProp, precedence, callback) {
        metaProp.affectedBy.push({
            precedence,
            callback: (getValue, input) => {
                const value = getValue(this);
                return callback(value, input);
            }
        });
        metaProp.affectedBy.sort((a, b) => a.precedence - b.precedence);
        return this;
    }
    getDecorator(value) {
        const metaProp = this;
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
            let decoratedProps = metadata[metadataKey];
            if (!decoratedProps || !Object.hasOwn(metadata, metadataKey)) {
                metadata[metadataKey] = new Map();
                if (decoratedProps) {
                    // inherit from superclass
                    for (const [propKey, propMetaProps] of decoratedProps) {
                        const copy = new Map();
                        for (const [metaPropKey, metaPropRecord] of propMetaProps) {
                            // clone to avoid modifying superclass metadata
                            copy.set(metaPropKey, {
                                value: metaPropRecord.value,
                                conditional: [...metaPropRecord.conditional],
                            });
                        }
                    }
                }
                decoratedProps = metadata[metadataKey];
            }
            if (kind === 'class') {
                // store all class decorator value under `undefined` to distinguish them from 
                // member decorator values
                name = undefined;
            }
            let propMetaProps = decoratedProps.get(name);
            if (!propMetaProps) {
                decoratedProps.set(name, propMetaProps = new Map());
            }
            let entry = propMetaProps.get(metaProp);
            if (!entry) {
                propMetaProps.set(metaProp, entry = { conditional: [] });
            }
            if (condition) {
                entry.conditional.push({ value, condition });
            }
            else {
                entry.value = value;
            }
        }
    }
}
const getValue = Symbol('get value');
const recursionFlag = Symbol('recursionFlag');
export class MetaPropReader {
    ctor;
    context;
    cache = new Map();
    constructor(obj, context = {}) {
        this.ctor = typeof obj === 'function' ? obj : Object.getPrototypeOf(obj).constructor;
        this.context = context;
    }
    get(metaProp, key) {
        const context = this.context;
        let cache;
        if (this.cache.has(key)) {
            cache = this.cache.get(key);
        }
        else {
            this.cache.set(key, cache = new Map());
        }
        const metaProps = this.ctor[Symbol.metadata]?.[metadataKey]
            ?.get(key);
        return getLazily(metaProp);
        function getLazily(mp) {
            const cached = cache.get(mp);
            if (cached) {
                if (cached === recursionFlag)
                    throw new Error('Unable to get value meta property due to recursive dependencies.');
                return cached;
            }
            cache.set(mp, recursionFlag);
            const record = metaProps?.get(mp);
            const value = getExpensively(mp, record);
            cache.set(mp, value);
            return value;
        }
        function getExpensively(mp, record) {
            if (record) {
                for (const { condition, value } of record.conditional) {
                    if (condition(context))
                        return value;
                }
                if (record.value !== undefined)
                    return record.value;
            }
            return mp.affectedBy.reduce((prev, sideEffect) => sideEffect.callback((mp) => getLazily(mp), prev), mp.defaultValue);
        }
    }
    /**
     * Returns key-value pairs of class members for which this meta property has a value
     *
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of key-value pairs
     */
    entries(metaProp) {
        const decoratedProps = this.ctor[Symbol.metadata]?.[metadataKey];
        const arr = [];
        for (const key of decoratedProps?.keys() ?? []) {
            if (key === undefined)
                continue;
            arr.push([key, this.get(metaProp, key)]);
        }
        return arr;
    }
    list(metaProp) {
        return this.entries(metaProp)
            .filter(([_, v]) => v)
            .map(([k]) => k);
    }
}
