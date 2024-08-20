// Symbol.metadata polyfill
(Symbol as any).metadata ??= Symbol('Symbol.metadata');

const metadataKey: unique symbol = Symbol('meta-properties');

type SideEffect<T> = {
    precedence: number,
    callback: (getValue: <U>(metaProp: MetaProperty<U>) => U, input: T, getMetaPropReader: (ctor?: Constructor) => MetaPropReader, ctor: Constructor, key: string | symbol | undefined) => T,
};

export class MetaProperty<T> {
    description: string;
    defaultValue: T;
    affectedBy: SideEffect<T>[] = [];

    constructor(desciption: string, defaultValue: T) {
        this.description = desciption;
        this.defaultValue = defaultValue;
    }

    addDependency<U>(metaProp: MetaProperty<U>, precedence: number, callback: (value: U, input: T) => T): MetaProperty<T> {
        this.affectedBy.push({
            precedence, 
            callback: (getValue: <V>(metaProp: MetaProperty<V>) => V, input: T) => {
                const value = getValue(metaProp);
                return callback(value, input);
            }
        });
        metaProp.affectedBy.sort((a, b) => a.precedence - b.precedence);
        return this;
    }

    addSideEffect<U>(metaProp: MetaProperty<U>, precedence: number, callback: (value: T, input: U) => U): MetaProperty<T> {
        metaProp.affectedBy.push({ 
            precedence, 
            callback: (getValue: <V>(metaProp: MetaProperty<V>) => V, input: U) => {
                const value = getValue(this);
                return callback(value, input);
            }
        });
        metaProp.affectedBy.sort((a, b) => a.precedence - b.precedence);
        return this;
    }

    getDecorator(value: T) {
        const metaProp = this;
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
            if (kind === 'class') {
                // store all class decorator value under `undefined` to distinguish them from 
                // member decorator values
                name = undefined;
            }
            metaProp.updateMetadata(metadata, name, value, condition);
        }
    }

    private updateMetadata(metadata: DecoratorMetadataObject, key: string | symbol | undefined, value: T, condition?: MetaPropCondition) {
        let decoratedProps = metadata[metadataKey] as Map<string | symbol | undefined, Map<MetaProperty<any>, MetaPropRecord<any>>> | undefined;
        if (!decoratedProps || !Object.hasOwn(metadata, metadataKey)) {
            const superDecoratedProps = decoratedProps
            metadata[metadataKey] = decoratedProps = new Map();
            if (superDecoratedProps) {
                // inherit from superclass
                for (const [propKey, propMetaProps] of superDecoratedProps) {
                    const copy: typeof propMetaProps = new Map();
                    for (const [metaPropKey, metaPropRecord] of propMetaProps) {
                        // clone to avoid modifying superclass metadata
                        copy.set(metaPropKey, {
                            value: metaPropRecord.value,
                            conditional: [...metaPropRecord.conditional],
                        })
                    }
                    decoratedProps.set(propKey, copy);
                }
            }
        }
        let propMetaProps = decoratedProps.get(key);
        if (!propMetaProps) {
            decoratedProps.set(key, propMetaProps = new Map());
        }
        let entry = propMetaProps.get(this);
        if (!entry) {
            propMetaProps!.set(this, entry = { conditional: [] });
        }
        if (condition) {
            entry.conditional.push({ value, condition });
        } else {
            entry.value = value;
        }
    }    

    apply(ctor: Constructor, key: string | symbol | undefined, value: T, condition?: MetaPropCondition) {
        let metadata: DecoratorMetadataObject | undefined;
        if (Object.hasOwn(ctor, Symbol.metadata)) {
            metadata = ctor[Symbol.metadata] as DecoratorMetadataObject;
        } else {
            let base = Object.getPrototypeOf(ctor.prototype)?.constructor;
            let baseMetadata: DecoratorMetadataObject | null = null;
            while (base && !baseMetadata) {
                baseMetadata = base[Symbol.metadata] ?? null;
                base = Object.getPrototypeOf(base.prototype)?.constructor;
            }
            metadata = Object.create(baseMetadata) as DecoratorMetadataObject;
            ctor[Symbol.metadata] = metadata;
        }
        this.updateMetadata(metadata, key, value, condition);
    }
    
}

const getValue = Symbol('get value');

const recursionFlag = Symbol('recursionFlag');

export class MetaPropReader {
    private ctor: Constructor;
    context: { [k: string]: any };
    cache: Map<string | symbol | undefined, Map<MetaProperty<any>, any>> = new Map();
    
    constructor(obj: object | Constructor, context: { [k: string]: any } = {}) {
        this.ctor = typeof obj === 'function' ? obj : Object.getPrototypeOf(obj).constructor;
        this.context = context;
    }

    get<T>(metaProp: MetaProperty<T>, key?: string | symbol): T {
        const context = this.context;
        const ctor = this.ctor;
        let cache: Map<MetaProperty<any>, any>;
        if (this.cache.has(key)) {
            cache = this.cache.get(key)!;
        } else {
            this.cache.set(key, cache = new Map());
        }
        const metaProps = (this.ctor[Symbol.metadata]?.[metadataKey] as 
            Map<string | symbol | undefined, Map<MetaProperty<any>, MetaPropRecord<any>>> | undefined)
            ?.get(key);

        return getLazily(metaProp);

        function getLazily<T>(mp: MetaProperty<T>): T {
            const cached = cache.get(mp);
            if (cached) {
                if (cached === recursionFlag) throw new Error('Unable to get value meta property due to recursive dependencies.');
                return cached;
            }
            cache.set(mp, recursionFlag);
            const record = metaProps?.get(mp);
            const value = getExpensively(mp, record);
            cache.set(mp, value);
            return value;
        }

        function getExpensively<T>(mp: MetaProperty<T>, record: MetaPropRecord<any> | undefined) {
            if (record) {
                for (const { condition, value } of record.conditional) {
                    if (condition(context)) return value;
                }
                if (record.value !== undefined) return record.value;
            }
            return mp.affectedBy.reduce(
                (prev, sideEffect) => sideEffect.callback((mp) => getLazily(mp), prev, getMetaPropReader, ctor, key),
                mp.defaultValue,
            );
        }

        function getMetaPropReader(obj?: object | Constructor): MetaPropReader {
            return new MetaPropReader(obj ?? ctor, context);
        }
    }

    /**
     * Returns key-value pairs of class members for which this meta property has a value
     * 
     * @param obj - instance or constructor of the class to which this meta property was applied
     * @returns array of key-value pairs
     */
    entries<T>(metaProp: MetaProperty<T>): [(string | symbol), NonNullable<T>][] {
        const decoratedProps = this.ctor[Symbol.metadata]?.[metadataKey] as 
            Map<string | symbol | undefined, Map<MetaProperty<any>, MetaPropRecord<any>>> | undefined;

        const arr: [(string | symbol), NonNullable<T>][] = [];
        for (const key of decoratedProps?.keys() ?? []) {
            if (key === undefined) continue;
            const value = this.get(metaProp, key);
            if (value == undefined) continue;
            arr.push([key, value]);
        }
        return arr;
    }

    list<T>(metaProp: MetaProperty<T>) {
        return this.entries(metaProp)
            .filter(([_, v]) => v)
            .map(([k]) => k);
    }
}

export type Constructor<T = object> = new (...args: any[]) => T;

type MetaPropCondition = (context: { [k: string]: any }) => boolean;

type MetaPropRecord<T> = {
    value?: T,
    conditional: ({
        condition: MetaPropCondition,
        value: T,
    })[],
};


export const defaultProp = new MetaProperty<any>('default', undefined);
defaultProp.affectedBy.push({
    precedence: 0,
    callback: (_g, _i, getMetaPropReader, ctor, key) => {
        if (key) {
            const reader = getMetaPropReader();
            const defaultObj = reader.get(defaultProp);
            return defaultObj[key];
        } else {
            return createFromEntries(ctor, []);
        }

        // duplicated from type.ts (temporary workaround; TODO clean up later)
        function createFromEntries<T>(ctor: Constructor<T>, entries: [string | symbol, any][]): T | undefined {
            // If a `fromEntries` static method exists, call that
            if (typeof (ctor as any).fromEntries === 'function') {
                return (ctor as any).fromEntries(entries);
            }
        
            // Otherwise try calling the constructor with zero args, then setting properties
            try {
                const obj = new ctor();
                for (const [k, v] of entries) {
                    (obj as any)[k] = v;
                }
                return obj;
            } catch (_) {
                return undefined;
            }
        }
    }
});