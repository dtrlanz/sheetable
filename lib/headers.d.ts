import { Constructor } from "./meta-props.js";
import { TableWalker } from "./sheet-navigation.js";
export declare class Header<T> {
    #private;
    readonly ctor: Constructor<T>;
    readonly context: {
        readonly [k: string]: any;
    };
    private columns;
    get firstRow(): number;
    get rowCount(): number;
    get firstCol(): number;
    get colCount(): number;
    private constructor();
    static create<T extends object>(ctor: Constructor<T>, samples: Iterable<T>, context?: {
        readonly [k: string]: any;
    }, firstRow?: number, firstColumn?: number): Header<T>;
    static open<T>(ctor: Constructor<T>, header: Branch[], context?: {
        readonly [k: string]: any;
    }): Header<T>;
    getColumnsForTitle(title: string[]): number[];
    getKeyForColumns(column: number): (string | symbol | number)[] | undefined;
    getHeaderRows(): string[][];
    getRowValues(record: any): any[];
}
export interface Branch {
    label: any;
    row: number;
    start: number;
    stop: number;
    children: Branch[];
}
export type BranchResult = {
    branches: Branch[];
    minRowStop: number;
    maxRowStop: number;
};
export declare function findBranches(walker: TableWalker): BranchResult | null;
export declare function getHeadersHelper(walker: TableWalker): {
    branches: Branch[];
    rowStop: number;
};
