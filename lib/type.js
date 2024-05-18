import { MetaProperty } from "./meta-props.js";
const typeProp = new MetaProperty('type');
export function type(t) {
    return typeProp.getDecorator(t);
}
export function getPropType(obj, key, context) {
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
    let arr = false;
    if (Array.isArray(val)) {
        val = val[0];
        arr = true;
    }
    let valType;
    switch (typeof val[0]) {
        case 'object':
            valType = val ? Object.getPrototypeOf(val).constructor : undefined;
            break;
        case 'string':
            valType = String;
            break;
        case 'number':
            valType = Number;
            break;
        case 'bigint':
            valType = BigInt;
            break;
        case 'boolean':
            valType = Boolean;
            break;
        case 'symbol':
            valType = Symbol;
            break;
        case 'function':
        case 'undefined':
            valType = undefined;
    }
    if (arr) {
        return [valType];
    }
    return valType;
}
/**
 * Gets the constructor for the specified property, if it is an object type. Returns undefined if
 * the specified property is primitive or non-existent.
 * @param obj - the parent object or its constructor
 * @param key - the property key
 * @param context - context object for filtering decorators
 * @returns Constructor | undefined - the constructor function for the specified property
 */
export function getPropConstructor(obj, key, context) {
    let propCtor = getPropType(obj, key, context);
    // in case of array, use first element as sample
    if (Array.isArray(propCtor)) {
        propCtor = propCtor[0];
    }
    if (typeof propCtor === 'function') {
        if (propCtor !== String &&
            propCtor !== Boolean &&
            propCtor !== Number &&
            propCtor !== BigInt &&
            propCtor !== Symbol) {
            return propCtor;
        }
    }
    return undefined;
}
export function getPropConfig(obj, key, context) {
    const propType = getPropType(obj, key, context);
    let validate;
    let stringify;
    let parse;
    switch (propType) {
        case String:
            validate = v => typeof v === 'string' ? '' : 'string required';
            stringify = v => String(v);
            parse = v => v;
            break;
        case Number:
            validate = v => typeof v === 'number' && !Number.isNaN(v) ? '' : 'number required';
            stringify = v => String(v);
            parse = v => Number.parseFloat(v);
            break;
        case BigInt:
            validate = v => typeof v === 'bigint' ? '' : 'bigint required';
            stringify = v => String(v);
            parse = v => {
                try {
                    return BigInt(v);
                }
                catch (_) {
                    return undefined;
                }
            };
            break;
        case Boolean:
            validate = v => typeof v === 'boolean' ? '' : 'boolean required';
            stringify = v => v ? 'true' : '';
            parse = v => Boolean(v);
            break;
        case Symbol:
            validate = v => typeof v === 'symbol' ? '' : 'symbol required';
            stringify = v => String(v);
            parse = v => { throw new Error(`cannot convert string to symbol: ${v}`); };
            break;
        case Date:
            validate = v => v instanceof Date ? '' : 'date required';
            stringify = v => v.toISOString();
            parse = v => new Date(v);
        case undefined:
            validate = v => typeof v === 'undefined' ? '' : 'undefined required';
            stringify = v => String(v);
            // We could just return undefined here. But if this function ever gets called,
            // there's probably something wrong.
            parse = v => { throw new Error(`cannot convert string to undefined: ${v}`); };
            break;
        default:
            if (Array.isArray(propType)) {
                validate = v => Array.isArray(v) ? '' : 'array required';
                stringify = JSON.stringify;
                parse = JSON.parse;
            }
            else {
                validate = v => Object.getPrototypeOf(v).constructor === propType
                    ? ''
                    : `invalid ${propType.name}`;
                stringify = JSON.stringify;
                parse = v => {
                    try {
                        const entries = convertToEntriesRecursively(JSON.parse(v));
                        return createRecursively(propType, entries);
                    }
                    catch (_) {
                        return undefined;
                    }
                };
            }
    }
    return {
        type: propType,
        validate,
        stringify,
        parse,
    };
}
export function convertToEntries(obj) {
    if (typeof obj.toEntries === 'function') {
        return obj.toEntries();
    }
    // While a custom method `toEntries` (see above) may include symbol keys, the default
    // implementation does not. Hence the function return type is broader than the type of the
    // following array.
    const entries = [];
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            entries.push([i, obj[i]]);
        }
    }
    else {
        for (const k in obj) {
            // exclude methods
            if (typeof obj[k] !== 'function') {
                entries.push([k, obj[k]]);
            }
        }
    }
    return entries;
}
export function convertToEntriesRecursively(obj) {
    const entries = [];
    for (const [key, value] of convertToEntries(obj)) {
        if (obj[key] && typeof obj[key] === 'object') {
            const childEntries = convertToEntriesRecursively(value);
            for (const [keyTail, simpleValue] of childEntries) {
                entries.push([[key, ...keyTail], simpleValue]);
            }
        }
        else {
            entries.push([[key], value]);
        }
    }
    return entries;
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