import { MetaProperty, Constructor } from "./meta-props.js";
import { getPropConstructor } from "./type.js";

const titleProp = new MetaProperty<string | string[]>('title');
const spreadProp = new MetaProperty<boolean>('spread');
const restProp = new MetaProperty<boolean>('rest');

export const spread = spreadProp.getDecorator(true);
export const rest = restProp.getDecorator(true);

export function title(title: string, ...rest: string[]) {
    if (rest.length === 0) {
        return titleProp.getDecorator(title);
    } else {
        return titleProp.getDecorator([title, ...rest]);
    }
}

export function getObjectPath(title: string[], obj: object | Constructor, context?: { [k: string]: any }, includeRest: boolean = true): (string | symbol | number)[] | undefined {
    if (title.length === 0) return [];

    // TODO: cache this stuff
    const toBeSpread = new Set(spreadProp.getReader(context).list(obj));
    const restList = restProp.getReader(context).list(obj);
    if (restList.length > 1) throw new Error('only one member can be annoted with @rest');
    const restKey = restList.at(0);
    if (restKey && !toBeSpread.has(restKey)) {
        console.warn('@rest decorator is ignored unless accompanied by @spread');
    }
    const map: Map<string, { key: string | symbol, idx?: number }> = new Map();
    const titlePropReader = titleProp.getReader(context);
    for (const [key, value] of titlePropReader.entries(obj)) {
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
                console.warn(`Rest titles [${value.slice(1).join(', ')}] are ignored unless @spread decorator is also applied.`);
                map.set(value[0], { key });
            }
        }
    }

    let found = map.get(title[0]);
    if (!found) {
        // Title mapping not defined. Try using title directly as property key.
        const objOrPrototype = typeof obj === 'object' ? obj : Object.getPrototypeOf(obj);
        if (title[0] in objOrPrototype) {
            found ??= { key: title[0] };
        }
        if (!found) {
            // Property not found on this object.
            // Next try members of properties with @spread decorator.
            for (const key of toBeSpread) {
                // exclude properties with array spreading (only interested in object spreading here)
                if (typeof titlePropReader.get(obj, key) === 'object') continue;

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