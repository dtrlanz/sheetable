import { Header } from "./headers.js";
import { Constructor } from "./meta-props.js";
import { Scalar } from "./values.js";
export declare const index: {
    (_target: any, context: DecoratorContext): void;
    where(condition: (context: {
        [k: string]: any;
    }) => boolean): (_target: any, context: DecoratorContext) => void;
};
/**
 * Index — dinstinguishes a set of records by their indexed properties and associates a given
 *  value with each record in a map-like structure.
 *
 * T — the type of records that are to be indexed
 * V — the type of value to be associated with each record
 */
export declare class Index<T extends object, V> {
    ctor: Constructor<T>;
    context?: {
        readonly [k: string]: any;
    };
    header: Header<T>;
    indexKeys: (string | symbol)[];
    indexTitles: string[];
    map: TupleMap<V>;
    constructor(ctor: Constructor<T>, header: Header<T>, context?: {
        readonly [k: string]: any;
    });
    getIndexedPropsFromObjects(objects: Iterable<T>): Iterable<[any[], T]>;
    /**
     * Converts each row of data to a tuple containing the values of indexed properties in that
     * record. This involves selecting the relevant columns, constructing objects from those
     * column values where needed, and returning the result as a tuple.
     * @param rows — an iterable or rows; each row is an array whose elements correspond to table
     *  columns
     * @param colNumbers — a numeric array identifying the column numbers corresponding to the
     *  elements in each row of data
     * @returns — an iterable of tuples corresponding the input rows, each one containing the
     *  indexed properties of the given record
     */
    getIndexedPropsFromRows(rows: Iterable<Scalar[]>, colNumbers: number[]): Iterable<any[]>;
    /**
     * Sets the index ids for multiple rows of data
     * @param indexedProps — an iterable of tuples each containing the indexed
     *  properties of a record
     * @param initValue — callback that returns the value to be stored; will be called for
     *  elements that do not already exist
     */
    initAll(indexedProps: Iterable<Scalar[]>, initValue: () => V): void;
    /**
     * Adds an element for an indexed record if it does not already exist.
     * @param idxValues — tuple of index values for a given record
     * @param initValue — callback that returns the value to be stored; will only be called if an
     *  element does not already exist for the indexed record
     * @returns the value (newly initialized or already existing)
     */
    init(idxValues: any[], initValue: () => V): V;
    /**
     * Adds an element for an indexed record if it does not already exist, otherwise updates the
     * existing element.
     * @param idxValues — tuple of index values for a given record
     * @param value — the value to be associated with that record
     */
    set(idxValues: any[], value: V): void;
    /**
     * Gets the element associated with an indexed record.
     * @param indexedValues — values of indexed properties for a given record
     * @returns — element associated with that record, if any; otherwise `undefined`
     */
    get(indexedValues: any[]): V | undefined;
}
export declare function getIndexKeys(ctor: Constructor, context?: {
    readonly [k: string]: any;
}): (string | symbol)[];
type TupleMapNode<T> = {
    value?: T;
    next: Map<any, TupleMapNode<T>>;
};
/**
 * TupleMap — map that uses variable-length tuples as keys
 *
 * This class will probably become obsolete if/when the Records & Tuples Proposal reaches stage 4
 * (see https://github.com/tc39/proposal-record-tuple).
 */
export declare class TupleMap<T = any> {
    map: Map<any, TupleMapNode<T>>;
    /**
     * Adds a new element with a specified key to the Map if an element with the same does not
     * already exist.
     * @param key
     * @param init — callback that returns the value to be stored; will only be called if an
     *  element with the specified key does not already exist
     * @returns the value (newly initialized or already existing)
     */
    init(key: any[], init: () => T): T;
    /**
     * Adds a new element with a specified key and value to the Map. If an element with the same
     * key already exists, the element will be updated.
     * @param key
     * @param value
     */
    set(key: any[], value: T): void;
    /**
     * Returns a specified element from the map.
     * @param key
     * @returns — the element associated with the specified key, if any, or undefined
     */
    get(key: any[]): T | undefined;
}
export {};
