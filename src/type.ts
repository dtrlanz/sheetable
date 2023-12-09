import { Constructor } from "./meta-props.js";

export function getPropConstructor(obj: object | Constructor, key: string | symbol): Constructor {
    // requires type decorators which are not yet implemented
    throw new Error('not yet implemented: retrieve property type from constructor');
}
