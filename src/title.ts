import { MetaProperty, Constructor } from "./meta-props.js";

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
    const map: Map<string, { key: string | symbol, idx?: number }> = new Map();
    for (const [key, v] of titleProp.getReader(context).entries(obj)) {
        if (typeof v === 'string') {
            map.set(v, { key });
        } else {
            for (let idx = 0; idx < v.length; idx++) {
                map.set(v[idx], { key, idx })
            }
        }
    }

    const found = map.get(title[0]);
    if (!found) return undefined;
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
            throw new Error('not yet implemented: retrieve property type from constructor');
        }
        const nextPath = getObjectPath(title.slice(1), nextObj, context);
        if (!nextPath) {
            return undefined;
        }
        tail = nextPath;
    }

    if (idx) {
        return [key, idx, ...tail];
    } else {
        return [key, ...tail];
    }
}