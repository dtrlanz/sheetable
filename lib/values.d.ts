/**
 * A type is considered scalar if its commonly stored in a single column. This includes all
 * primitive values plus Date.
 *
 * Whether a type is scalar only pertains to the way JavaScript object structures map to table
 * structures. A value being scalar does not guarantee that it can be safely stored and retrieved
 * in spreadsheet cells. Spreadsheets do not support undefined, null, symbol, and bigint values.
 * These are converted to strings (the first 3 to empty strings), though it is not clear from the
 * documentation whether this behavior is guaranteed; see
 * <https://developers.google.com/apps-script/reference/spreadsheet/range#setvaluevalue>.
 *
 * (On a side note, as of Dec 2023, the Google Apps Script parser seems to block bigint literals.
 * The type as such is supported but values need to be created with the `BigInt()` function. In
 * any case, using bigint values in tables is not recommended without special handling because
 * they are converted to strings.)
 */
export type Scalar = null | undefined | boolean | number | bigint | string | symbol | Date;
/**
 * Returns `true` if the value is scalar for the purposes of table structure, i.e., if it
 *
 * @param value - the value to test
 * @returns boolean
 */
export declare function isScalar(value: any): value is Scalar;
/**
 * A type is sendable if it can be sent between client & server without conversion. This includes
 * primitive types and plain objects & arrays (including deeply nested ones) but not Date.
 *
 * Dates need to be converted to plain objects using `toSendable()` before sending them to/from
 * the server.
 */
export type Sendable = null | undefined | boolean | number | bigint | string | symbol | {
    date: string;
};
/**
 * Converts scalar values to their sendable equivalents. Specifically, converts dates to their
 * corresponding string representations wrapped in objects.
 *
 * @param value - a value, array, or 2-dimensional array of values
 * @returns Sendable, or Sendable array of the same shape as the input
 */
export declare function toSendable(value: Scalar): Sendable;
export declare function toSendable(value: Scalar[]): Sendable[];
export declare function toSendable(value: Scalar[][]): Sendable[][];
export declare function toSendable(value: (Scalar[] | undefined)[]): (Sendable[] | undefined)[];
/**
 * Converts sendable values to their scalar equivalents. Specifically, converts object-wrapped
 * date strings back to Date objects.
 *
 * @param value - a value, array, or 2-dimensional array of values
 * @returns Scalar, or Scalar array of the same shape as the input
 */
export declare function fromSendable(value: Sendable): Scalar;
export declare function fromSendable(value: Sendable[]): Scalar[];
export declare function fromSendable(value: Sendable[][]): Scalar[][];
export declare function fromSendable(value: (Sendable[] | undefined)[]): (Scalar[] | undefined)[];
