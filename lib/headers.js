import { getKeysWithTitles, getObjectPath } from "./title.js";
export class Header {
    ctor;
    context;
    #firstRow;
    #rowCount;
    #firstCol;
    columns;
    get firstRow() { return this.#firstRow; }
    get rowCount() { return this.#rowCount; }
    get firstCol() { return this.#firstCol; }
    get colCount() { return this.columns.length; }
    constructor(ctor, context, columns, firstRow, firstCol) {
        this.ctor = ctor;
        this.context = context;
        this.#firstRow = firstRow;
        this.#rowCount = columns.reduce((max, col) => Math.max(max, col?.titles.length ?? 0), 1);
        this.#firstCol = firstCol;
        this.columns = columns;
        this.getRowValues = this.getRowValues.bind(this);
    }
    static create(ctor, samples, context = {}, firstRow = 1, firstColumn = 1) {
        const branches = [];
        for (const obj of samples) {
            for (const [_, title] of getKeysWithTitles(obj, context)) {
                addBranch(branches, firstRow, title);
            }
        }
        numberColumns(branches, firstColumn);
        // seems slightly inefficient (the columns just converted to branches will be converted 
        // back to columns)
        return Header.open(ctor, branches, context);
        function addBranch(branches, row, title) {
            if (title.length === 0)
                return;
            let match = branches.find(b => b.label === title[0]);
            if (!match) {
                match = {
                    label: title[0],
                    row,
                    start: 0,
                    stop: 0,
                    children: [],
                };
                branches.push(match);
            }
            addBranch(match.children, row + 1, title.slice(1));
        }
        function numberColumns(branches, col) {
            if (branches.length === 0)
                return col + 1;
            for (const branch of branches) {
                branch.start = col;
                col = numberColumns(branch.children, col);
                branch.stop = col;
            }
            return col;
        }
    }
    static open(ctor, header, context = {}) {
        const firstRow = header[0].row;
        const firstCol = header[0].start;
        const columns = branchesToColumns([], header).map(titles => {
            if (!titles)
                return undefined;
            const keys = getObjectPath(titles, ctor, context);
            if (!keys)
                return undefined;
            return { titles, keys };
        });
        return new Header(ctor, context, columns, firstRow, firstCol);
        function branchesToColumns(prefix, branches) {
            let arr = [];
            let col = branches[0].start;
            for (const b of branches) {
                for (; col < b.start; col++) {
                    arr.push(undefined); // preserve column gaps
                }
                if (b.children.length) {
                    arr = [...arr, ...branchesToColumns([...prefix, b.label], b.children)];
                    col = b.children.at(-1).stop;
                }
                else {
                    arr.push([...prefix, b.label]);
                    col++;
                }
            }
            return arr;
        }
    }
    getColumnsForTitle(title) {
        const arr = [];
        outer: for (let i = 0; i < this.columns.length; i++) {
            for (let j = 0; j < title.length; j++) {
                if (this.columns[i]?.titles[j] !== title[j])
                    continue outer;
            }
            arr.push(i + this.firstCol);
        }
        return arr;
    }
    getKeyForColumns(column) {
        return this.columns[column - this.firstCol]?.keys;
    }
    getHeaderRows() {
        const rows = Array(this.#rowCount);
        for (let rowIdx = 0; rowIdx < this.#rowCount; rowIdx++) {
            rows[rowIdx] = Array(this.columns.length);
        }
        for (let colIdx = 0; colIdx < this.columns.length; colIdx++) {
            for (let rowIdx = 0; rowIdx < this.#rowCount; rowIdx++) {
                const title = this.columns[colIdx]?.titles[rowIdx] ?? '';
                if (title !== this.columns[colIdx - 1]?.titles[rowIdx]) {
                    rows[rowIdx][colIdx] = title;
                }
                else {
                    rows[rowIdx][colIdx] = '';
                }
            }
        }
        return rows;
    }
    getRowValues(record) {
        const arr = [];
        for (let i = 0; i < this.columns.length; i++) {
            const keys = this.columns[i]?.keys;
            if (!keys)
                continue;
            arr[i] = getValue(record, keys);
        }
        return arr;
        function getValue(obj, keys) {
            if (!keys.length)
                return obj;
            if (!obj || typeof obj !== 'object')
                return undefined;
            return getValue(obj[keys[0]], keys.slice(1));
        }
    }
}
export function findBranches(walker) {
    //const ui = SpreadsheetApp.getUi();
    if (!walker.value)
        return null;
    const startPoints = walker.findAll(0, 1, v => v);
    //ui.alert(JSON.stringify(startPoints.map(p => p.value)));
    const topLevel = walker.row === walker.region.rowStart;
    let minRowStop = walker.region.rowStart + 1; //#???
    let maxRowStop = walker.region.rowStop;
    const arr = [];
    for (let i = 0; i < startPoints.length; i++) {
        const stop = startPoints[i + 1]?.col ?? walker.region.colStop;
        const region = startPoints[i].move(1, 0)?.crop(undefined, maxRowStop, undefined, stop);
        //ui.alert(`walker.value: ${walker.value}\nstartpoints[i].value: ${startPoints[i].value}\nstop: ${stop}\nmaxRowStop: ${maxRowStop}\nregion: ${region}`);
        let children = [];
        if (region) {
            const nextLevel = findBranches(region);
            if (nextLevel) {
                if (minRowStop < nextLevel.minRowStop)
                    minRowStop = nextLevel.minRowStop;
                if (maxRowStop > nextLevel.maxRowStop)
                    maxRowStop = nextLevel.maxRowStop;
                children = nextLevel.branches;
            }
            else {
                const dataStart = region.find(1, 0, v => v);
                if (dataStart && dataStart.row < maxRowStop) {
                    maxRowStop = dataStart.row;
                }
            }
        }
        const actualStop = children.at(-1)?.stop ?? startPoints[i].col + 1;
        arr.push({
            label: startPoints[i].value,
            row: startPoints[i].row,
            start: startPoints[i].col,
            stop: actualStop,
            children: children,
        });
        // Gaps between branches are only allowed at the top level
        if (!topLevel && stop !== undefined && actualStop < stop)
            break;
    }
    if (arr.length > 1 && minRowStop < walker.row + 1)
        minRowStop = walker.row + 1;
    return {
        branches: arr,
        minRowStop: minRowStop,
        maxRowStop: maxRowStop,
    };
}
export function getHeadersHelper(walker) {
    let branches = [];
    let rowStop = walker.region.rowStop;
    if (!walker.value) {
        // unlabeled first column is ok (other columns are recognized by their headers)
        let next = walker.find(0, 1, v => v);
        branches.push({
            label: '',
            row: walker.row,
            start: walker.col,
            stop: next?.col ?? walker.col + 1,
            children: [],
        });
        const dataStart = walker.find(1, 0, v => v);
        if (dataStart)
            next = next?.crop(undefined, dataStart.row);
        walker = next ?? walker;
    }
    const br = findBranches(walker);
    if (br) {
        const { branches: otherBranches, minRowStop, maxRowStop } = br;
        branches = [...branches, ...otherBranches];
        // maxRowStop overrides minRowStop; if exact depth is uncertain, assume minimum
        rowStop = Math.min(minRowStop, maxRowStop);
    }
    return { branches, rowStop };
}
