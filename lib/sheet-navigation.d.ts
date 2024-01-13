import { Scalar } from "./values";
export type Orientation = 'normal' | 'transposed';
export interface SheetLike {
    getLastColumn(): number;
    getLastRow(): number;
    getName(): string;
    getRange(row: number, column: number, numRows?: number, numColumns?: number): RangeLike;
    insertColumns(columnPosition: number, numColumns?: number): void;
    insertRows(rowPosition: number, numRows?: number): void;
    deleteColumns(columnPosition: number, numColumns?: number): void;
    deleteRows(rowPosition: number, numRows?: number): void;
    setName(name: string): void;
}
export interface RangeLike {
    getValue(): Scalar;
    getValues(): Scalar[][];
    setValue(value: Scalar): void;
    setValues(values: Scalar[][]): void;
}
export declare class Region {
    readonly sheet: SheetLike;
    readonly orientation: Orientation;
    readonly colStart: number;
    readonly colStop: number;
    readonly rowStart: number;
    readonly rowStop: number;
    constructor(sheet: SheetLike, rowStart: number, rowStop: number, colStart: number, colStop: number, orientation: Orientation);
    static fromSheet(sheet: SheetLike, orientation?: Orientation): Region;
    resize(rowStart?: number, rowStop?: number, colStart?: number, colStop?: number): Region;
    crop(rowStart?: number, rowStop?: number, colStart?: number, colStop?: number): Region;
    read(row: number, col: number): Scalar;
    write(row: number, col: number, value: Scalar): void;
    readRow(row: number): Scalar[] | undefined;
    writeRow(row: number, data: Scalar[], onEnd: 'skip' | 'insert' | 'encroach'): Region;
    readAll(): Scalar[][];
    writeAll(data: Scalar[][]): void;
}
export declare class TableWalker {
    readonly region: Region;
    readonly row: number;
    readonly col: number;
    constructor(region: Region, row?: number, col?: number);
    static fromSheet(sheet: SheetLike, orientation?: Orientation): TableWalker;
    move(row: number, col: number): TableWalker | undefined;
    crop(rowStart?: number, rowStop?: number, colStart?: number, colStop?: number): TableWalker | undefined;
    find(rowDelta: number, colDelta: number, predicate: (v: Scalar) => boolean): TableWalker | undefined;
    findAll(rowDelta: number, colDelta: number, predicate: (v: Scalar) => boolean): TableWalker[];
    map<T>(rowDelta: number, colDelta: number, callback: (v: Scalar) => T): T[];
    get value(): Scalar;
}
