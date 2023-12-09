import { MetaProperty, Constructor } from "./meta-props.js";
import { getPropConstructor } from "./type.js";

const titleProp = new MetaProperty<string | string[]>('title');
const spreadProp = new MetaProperty<boolean>('spread');

export const spread = spreadProp.getDecorator(true);

export function title(title: string, ...rest: string[]) {
    if (rest.length === 0) {
        return titleProp.getDecorator(title);
    } else {
        return titleProp.getDecorator([title, ...rest]);
    }
}

export function getObjectPath(title: string[], obj: object | Constructor, context?: { [k: string]: any }): (string | symbol | number)[] | undefined {
    if (title.length === 0) return [];

    // to do: cache this stuff
    const toBeSpread = new Set(spreadProp.getReader(context).list(obj));
    const map: Map<string, { key: string | symbol, idx?: number }> = new Map();
    for (const [key, value] of titleProp.getReader(context).entries(obj)) {
        if (typeof value === 'string') {
            // only one title provided
            // - if spread: assume this is an object, use object's properties in place of current
            //   property
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
    // use property key as fallback
    found ??= { key: title[0] };
    const { key, idx } = found;

    let tail: (string | symbol | number)[] = [];
    if (title.length > 1) {
        let nextObj: object | Constructor;
        if (typeof obj === 'object') {
            let val = (obj as any)[key];
            if (idx !== undefined) {
                val = val[idx];
            }
            if (!(val && typeof val === 'object')) {
                return undefined;
            }
            nextObj = val;
        } else {
            nextObj = getPropConstructor(obj, key);
        }
        const nextPath = getObjectPath(title.slice(1), nextObj, context);
        if (!nextPath) {
            return undefined;
        }
        tail = nextPath;
    }

    if (idx !== undefined) {
        return [key, idx, ...tail];
    } else {
        return [key, ...tail];
    }
}