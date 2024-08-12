import { getIndexKeys } from "./index.js";
import { MetaProperty, Constructor, MetaPropReader } from "./meta-props.js";
import { createFromEntries, getPropConstructor } from "./type.js";
import { isScalar } from "./values.js";

const titleProp = new MetaProperty<string | string[] | undefined>('title', undefined);
const spreadProp = new MetaProperty<boolean>('spread', false);
const restProp = new MetaProperty<boolean>('rest', false);

export const spread = spreadProp.getDecorator(true);
export const rest = restProp.getDecorator(true);

export function title(title: string, ...rest: string[]) {
    if (rest.length === 0) {
        return titleProp.getDecorator(title);
    } else {
        return titleProp.getDecorator([title, ...rest]);
    }
}

export function getKeysWithTitles(obj: object, context?: { [k: string]: any }, includeRest: boolean = true): [key: (string | symbol | number)[], title: string[]][] {
    const ctor = Object.getPrototypeOf(obj).constructor;
    const sample = createFromEntries(ctor, []) as object;
    const mpReader = new MetaPropReader(ctor, context);
    const toBeSpread = new Set(mpReader.list(spreadProp));
    const restList = mpReader.list(restProp);
    if (restList.length > 1) throw new Error('only one member can be annoted with @rest');
    const restKey = restList.at(0);

    // `enumerableProps` includes, more specifically, own enumerable string-keyed properties
    const enumerableProps = Object.entries(obj)
        .map(([key, value]) => [key, value, mpReader.get(titleProp, key)] as const);
    // `titleProps` includes all properties with @title decorator not included in `enumerableProps`
    const titleProps = mpReader.entries(titleProp)
        .filter(([key]) => (typeof key === 'symbol' && key in obj || !Object.getOwnPropertyDescriptor(obj, key)?.enumerable))
        .map(([key, title]) => [key, (obj as any)[key], title] as const);

    const arr: [key: (string | symbol | number)[], title: string[]][] = [];
    for (let [key, value, title] of [...enumerableProps, ...titleProps]) {
        // Known properties are those which are present in a default instance.
        // Unknown properties are only included in results if `includeRest === true` 
        // and none of the other properties are decorated with @rest.
        if (!(key in sample || (includeRest && restKey === undefined))) continue;

        if (!isScalar(value)) {
            // Complex types (i.e., objects incl. arrays)
            if (typeof value === 'function') {
                // functions not supported
                console.warn(`functions are not supported: { ${String(key)}: ${value} }`);
                continue;
            }
            if (toBeSpread.has(key)) {
                if (Array.isArray(value)) {
                    // When spreading arrays, multiple titles are expected
                    if (Array.isArray(title)) {
                        // Process arrays item by item
                        for (let i = 0; i < title.length && i < value.length; i++) {
                            if (!isScalar(value[i])) {
                                // Get keys & titles of nested object recursively
                                for (const [keyTail, titleTail] of getKeysWithTitles(value[i], context)) {
                                    arr.push([[key, i, ...keyTail], [title[i], ...titleTail]]);
                                }
                            } else {
                                // Non-complex value, no recursion needed
                                arr.push([[key, i], [title[i]]]);
                            }
                        }
                    } else {
                        // on import, data would not be recognized as array
                        throw new Error(`array spreading requires multiple titles, e.g., @title('Title 1', 'Title 2', ...): { ${String(key)}: ${value} }`);
                    }
                } else {
                    if (Array.isArray(title)) {
                        // title arrays are only relevant for array spreading, not for object spreading
                        console.warn(`Additional titles [${title.slice(1).join(', ')}] are ignored for non-array objects.`);
                    }
                    // Get keys & titles of nested object recursively
                    for (const [keyTail, titleTail] of getKeysWithTitles(value, context, includeRest && key === restKey)) {
                        arr.push([[key, ...keyTail], titleTail]);
                    }
                }
            } else {
                if (restKey === key) {
                    // @rest decorator without @spread is ignored
                    console.warn(`@rest decorator is ignored unless accompanied by @spread: { ${String(key)}: ${value} }`);
                } 
                if (Array.isArray(title)) {
                    // non-initial titles are ignored without @spread
                    console.warn(`Additional titles [${title.slice(1).join(', ')}] are ignored unless @spread decorator is also applied.`);
                    title = title[0];
                }
                // `enumerableProps` contains only string keys; symbolProps contains only keys with valid title string
                if (title === undefined && typeof key === 'symbol') throw new Error('unreachable');
                title ??= key as string;
                // Just a nested object (no array/object spreading involved)
                if (Array.isArray(value)) {
                    // Process arrays item by item
                    for (let i = 0; i < value.length; i++) {
                        if (!isScalar(value[i])) {
                            // Get keys & titles of nested object recursively
                            for (const [keyTail, titleTail] of getKeysWithTitles(value[i], context)) {
                                arr.push([[key, i, ...keyTail], [title, `${i}`, ...titleTail]]);
                            }
                        } else {
                            // Non-complex value, no recursion needed
                            arr.push([[key, i], [title, `${i}`]]);
                        }
                    }
                } else {
                    // Get keys & titles of nested object recursively
                    for (const [keyTail, titleTail] of getKeysWithTitles(value, context)) {
                        arr.push([[key, ...keyTail], [title, ...titleTail]]);
                    }
                }
            }

        } else {
            // Non-complex types (i.e., primitive types & Date)
            if (toBeSpread.has(key)) {
                // @spread decorator would cause re-import to ignore title
                throw new Error(`@spread cannot be applied to scalar value: { ${String(key)}: ${String(value)} }`);
            }
            if (restKey === key) {
                // @rest decorator without @spread is ignored
                // would not cause re-import to fail, so a warning is sufficient here
                console.warn(`@rest decorator is ignored unless accompanied by @spread: { ${String(key)}: ${String(value)} }`);
            } 
            if (Array.isArray(title)) {
                // non-initial titles are ignored without @spread
                // would not cause re-import to fail, so a warning is sufficient here
                console.warn(`Additional titles [${title.slice(1).join(', ')}] are ignored unless @spread decorator is also applied.`);
                title = title[0];
            }
            // `enumerableProps` contains only string keys; symbolProps contains only keys with valid title string
            if (title === undefined && typeof key === 'symbol') throw new Error('unreachable');
            title ??= key as string;
            arr.push([[key], [title]]);
        }
    }
    return arr;
}

export function getObjectPath(title: string[], obj: object | Constructor, context?: { [k: string]: any }, includeRest: boolean = true): (string | symbol | number)[] | undefined {
    if (title.length === 0) return [];

    const mpReader = new MetaPropReader(obj, context);
    const toBeSpread = new Set(mpReader.list(spreadProp));
    const restList = mpReader.list(restProp);
    if (restList.length > 1) throw new Error('only one member can be annoted with @rest');
    const restKey = restList.at(0);
    if (restKey && !toBeSpread.has(restKey)) {
        console.warn('@rest decorator is ignored unless accompanied by @spread');
    }
    const map: Map<string, { key: string | symbol, idx?: number }> = new Map();
    for (const [key, value] of mpReader.entries(titleProp)) {
        if (!value) continue;
        if (typeof value === 'string') {
            // only one title provided
            // - if spread: assume this is an object, use object's properties in place of current
            //   property (no action needed right now)
            // - otherwise: store property key
            if (!toBeSpread.has(key)) {
                map.set(value, { key });
            }
        } else {
            // several titles provided
            // - if spread: assume this is an array, use title list as titles of array items
            // - otherwise: use first title, ignore rest (emit warning)
            if (toBeSpread.has(key)) {
                for (let idx = 0; idx < value.length; idx++) {
                    map.set(value[idx], { key, idx })
                }
            } else {
                console.warn(`Additional titles [${value.slice(1).join(', ')}] are ignored unless @spread decorator is also applied.`);
                map.set(value[0], { key });
            }
        }
    }

    let found = map.get(title[0]);
    if (!found) {
        // Title mapping not defined. Try using title directly as property key.
        // TODO: check this (seems wild)
        const objOrPrototype = typeof obj === 'object' ? obj : Object.getPrototypeOf(obj);
        if (title[0] in objOrPrototype) {
            found ??= { key: title[0] };
        }
        if (!found) {
            // Property not found on this object.
            // Next try members of properties with @spread decorator.
            for (const key of toBeSpread) {
                // exclude properties with array spreading (only interested in object spreading here)
                if (typeof mpReader.get(titleProp, key) === 'object') continue;

                const nextObj = objOrPrototype[key];
                if (nextObj && typeof nextObj === 'object') {
                    const path = getObjectPath(title, nextObj, context, includeRest && key === restKey);
                    if (path) {
                        return [key, ...path];
                    }
                }
            }
            // No match found.
            if (!found) {
                // If unmatched titles should be retained, default to using title as key.
                return includeRest ? title : undefined;
            }
        }
    }
    const { key, idx } = found;

    // Matching property was found for title[0]. Now process rest of title array.
    // Use title as fallback if further matching does not succeed.
    let tail: (string | symbol | number)[] = title.slice(1);
    if (title.length > 1) {
        let nextObj: object | Constructor | undefined;
        if (typeof obj === 'object') {
            let val = (obj as any)[key];
            if (idx !== undefined) {
                if (val && typeof val === 'object') {
                    val = val[idx];
                } else {
                    val = undefined;
                }
            }
            if (val && typeof val === 'object') {
                nextObj = val;
            }
        } else {
            nextObj = getPropConstructor(obj, key);
        }
        if (nextObj) {
            const nextPath = getObjectPath(title.slice(1), nextObj, context, false);
            if (nextPath) {
                tail = nextPath;
            }
        }
    }

    if (idx !== undefined) {
        return [key, idx, ...tail];
    } else {
        return [key, ...tail];
    }
}

export function getIndexTitles(ctor: Constructor, context?: { readonly [k: string]: any }): string[] {
    const keys = getIndexKeys(ctor, context);
    const mpReader = new MetaPropReader(ctor, context);
    return keys.map(k => {
        const title = mpReader.get(titleProp, k);
        if (title === undefined && typeof k === 'symbol') {
            throw new Error(`symbol-keyed property ${k.toString()} cannot be used as index unless it also has a string title`);
        }
        if (Array.isArray(title)) throw new Error('Properties with array titles are currently not allowed as indices');
        return title ?? (k as string);
    });
}