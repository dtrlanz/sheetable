import { SheetLike } from "./sheet-navigation.js";
import { Value } from "./values.js";

/**
 * Constructor compatible with Table class
 * 
 * Must either
 * - take 0 arguments (used to construct object to which further values are then assigned)
 * - provide a method `fromEntries` that uses provided entries to construct a new instance
 */
type TableConstructor<T> = new () => T 
    | { fromEntries: (entries: [string | symbol, Value][]) => T };

abstract class TableBase<T> {
    private fromEntries: (entries: [string | symbol, Value][]) => T;

    private constructor(fromEntries: (entries: [string | symbol, Value][]) => T) {
        this.fromEntries = fromEntries;
    }

    static open(sheet: SheetLike): TableBase<T> {

    }
}