/**
 * Returns `true` if the value is scalar for the purposes of table structure, i.e., if it
 *
 * @param value - the value to test
 * @returns boolean
 */
export function isScalar(value) {
    return !(value && typeof value === 'object') || value instanceof Date;
}
export function toSendable(value) {
    if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.map(toSendable);
        }
        else if (value instanceof Date) {
            return { date: value.toJSON() };
        }
        throw new Error(`cannot convert object types other than Array or Date: ${value}`);
    }
    else {
        return value;
    }
}
export function fromSendable(value) {
    if (Array.isArray(value)) {
        return value.map(fromSendable);
    }
    else if (value && typeof value === "object") {
        if ('date' in value) {
            return new Date(value.date);
        }
        throw new Error(`cannot convert from object types other than Array or Date: ${value}`);
    }
    else {
        return value;
    }
}
