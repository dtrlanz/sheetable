import { MetaProperty, Constructor } from "./meta-props.js";

type Type = 'string' | 'number' | 'bigint' | 'boolean' | 'symbol'
    | Constructor;

const typeProp = new MetaProperty<Type>('type');

export function type(t: Type) {
    return typeProp.getDecorator(t);
}

export function getPropConstructor(obj: object | Constructor, key: string | symbol, context?: { [k: string]: any }): Constructor | undefined {
    // TODO: cache this stuff

    // If the property type is specified with @type, use that
    const t = typeProp.getReader(context).get(obj, key);
    if (t) {
        return typeof t === 'function' ? t : undefined;
    }

    // Else try to infer the type from a sample

    // If we have a constructor instead of an instance object, try creating an instance
    if (typeof obj === 'function') {
        const o = createFromEntries(obj as Constructor, []);
        if (!o) return undefined;
        obj = o;
    }

    let val = (obj as any)[key];
    
    // in case of array, use first element as sample
    if (Array.isArray(val)) {
        val = val[0];
    }

    if (val && typeof val === 'object') {
        return Object.getPrototypeOf(val).constructor;
    }
}

export function createFromEntries<T>(ctor: Constructor<T>, entries: [string | symbol, any][]): T | undefined {
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