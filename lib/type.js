import { MetaProperty } from "./meta-props.js";
const typeProp = new MetaProperty('type');
export function type(t) {
    return typeProp.getDecorator(t);
}
export function getPropConstructor(obj, key, context) {
    // TODO: cache this stuff
    // If the property type is specified with @type, use that
    const t = typeProp.getReader(context).get(obj, key);
    if (t) {
        return typeof t === 'function' ? t : undefined;
    }
    // Else try to infer the type from a sample
    // If we have a constructor instead of an instance object, try creating an instance
    if (typeof obj === 'function') {
        const o = createFromEntries(obj, []);
        if (!o)
            return undefined;
        obj = o;
    }
    let val = obj[key];
    // in case of array, use first element as sample
    if (Array.isArray(val)) {
        val = val[0];
    }
    if (val && typeof val === 'object') {
        return Object.getPrototypeOf(val).constructor;
    }
}
export function createFromEntries(ctor, entries) {
    // If a `fromEntries` static method exists, call that
    if (typeof ctor.fromEntries === 'function') {
        return ctor.fromEntries(entries);
    }
    // Otherwise try calling the constructor with zero args, then setting properties
    try {
        const obj = new ctor();
        for (const [k, v] of entries) {
            obj[k] = v;
        }
        return obj;
    }
    catch (_) {
        return undefined;
    }
}
export function createRecursively(ctor, entries, context) {
    // flatten deep entries by converting them to objects recursively
    const flatEntries = flattenEntries(ctor, entries, context);
    // if keys provided were numbers, create an array
    const array = [];
    const objEntries = [];
    for (const [k, v] of flatEntries) {
        if (v === undefined)
            continue;
        if (typeof k === 'number') {
            array[k] = v;
        }
        else {
            objEntries.push([k, v]);
        }
    }
    if (array.length !== 0) {
        return array;
    }
    // otherwise construct an object
    if (ctor)
        return createFromEntries(ctor, objEntries);
}
export function flattenEntries(ctor, entries, context) {
    // Flat entries are those for which a simple key is provided
    // They can be used directly to construct an object.
    // E.g., `[[key], value]` becomes `{ key: value }`
    const flat = new Map();
    // Deep entries are those for which key tuples longer than 1 are provided
    // The first item of the key tuple indicates the property of the root object. Entries are
    // grouped by this property, the groups used to construct objects, and those objects are
    // used as values of the respective properties in the root object.
    // E.g., `[[key0, key1, key2], value]` becomes `{ key0: { key1: { key2: value } } }`
    const deep = new Map();
    // separate deep entries from flat ones
    for (const [k, v] of entries) {
        if (k.length === 0)
            throw new Error(`invalid entry (key required): ${[k, v]}`);
        if (k.length === 1) {
            flat.set(k[0], v);
        }
        else {
            let arr = deep.get(k[0]);
            if (!arr) {
                arr = [];
                deep.set(k[0], arr);
            }
            arr.push([k.slice(1), v]);
        }
    }
    // construct nested objects from nested entries
    for (const [key, entries] of deep) {
        // If nested objects form an array of objects, caller would have passed the necessary 
        // constructor, so pass same constructor on to the next recursion. (If it's an array
        // of primitive values, that constructor value will be ignored anyway.)
        const propCtor = typeof key === 'number' ? ctor
            // If nested objects form an object, not an array, retrieve the correct constructor 
            // for the property that it will be assigned to.
            : ctor ? getPropConstructor(ctor, key, context)
                // If we didn't get a constructor in the first place, we can't retrieve any 
                // information about the target property.
                : undefined;
        // If we don't have a specific constructor for the nested object, pass general `Object`
        // constructor as a fallback.
        const value = createRecursively(propCtor ?? Object, entries, context);
        flat.set(key, value);
    }
    return flat.entries();
}
