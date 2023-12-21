

export type Scalar = string | number | boolean | Date | undefined;

export function isScalar(value: any): value is Scalar {
    const t = typeof value;
    return t === 'string' || t === 'number' || t === 'boolean' 
        || value === undefined || value instanceof Date;
}

export function isComplex(value: any): boolean {
    // TODO: address cases like bigint
    return !isScalar(value);
}

export type Value = Scalar | Value[] | { [k: string]: Value };

// todo
export type Sendable = Value;

// todo
export function toSendable(input: Value): Sendable {
    return input;
}

// todo
export function fromSendable(input: Sendable): Value {
    return input;
}