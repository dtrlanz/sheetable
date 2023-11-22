import { Region, TableWalker } from "./sheet-navigation.js";

export interface HeaderLabels {
    [K: string]: string | string[];
}

export interface HeaderNode {
    readonly colStart: number;
    readonly colStop: number;
    readonly row: number;
    readonly children: HeaderChild[];
    ignore?: boolean;
}

export interface HeaderChild extends HeaderNode {
    readonly parent: HeaderNode;
    readonly key: string | [string, number];
    readonly label: string;
}

export function writeHeaders(headers: HeaderNode, region: Region) {
    if ('label' in headers) {
        region.write(headers.row, headers.colStart, headers.label);
    }
    for (const c of headers.children) writeHeaders(c, region);
}

export function createHeaders(
    obj: MetaTagged,
    colStart: number,
    row: number,
): HeaderNode {
    const children: (Omit<HeaderChild, 'parent'>)[] = [];
    let col = colStart;
    for (const k in obj) {
        const v = obj[k];
        if (Array.isArray(v)) {
            for (let i = 0; i < v.length; i++) {
                const label = obj[Sheetable.META]?.props.get(k)?.label?.[i] ?? `${k}[${i}]`;
                if (label === null) continue;
                const subHeaders = {
                    ...createHeaders(v[i], col, row + 1),
                    row: row,
                    key: [k, i] as [string, number],
                    label: label,
                };
                children.push(subHeaders);
                col = subHeaders.colStop;
            }
        } else {
            const label = obj[Sheetable.META]?.props.get(k)?.label ?? k;
            if (label === null) continue;
            if (Array.isArray(label)) throw Error('array not expected');
            if (typeof v === 'object' && !('toScalar' in v) && !(v instanceof Date)) {
                const subHeaders = {
                    ...createHeaders(v, col, row + 1),
                    row: row,
                    key: k,
                    label: label,
                };
                children.push(subHeaders);
                col = subHeaders.colStop;
            } else {
                children.push({
                    colStart: col,
                    colStop: col + 1,
                    row: row,
                    children: [],
                    key: k,
                    label: label,
                });
                col++;
            }
        }
    }
    const root = {
        colStart: colStart,
        colStop: col,
        row: row,
        children: [] as HeaderChild[],
    };
    root.children = children.map(child => ({
        ...child,
        parent: root,
    }));
    return root;
}

export interface Branch {
    label: any;
    row: number;
    start: number;
    stop: number;
    children: Branch[];
}

export type BranchResult = { branches: Branch[], minRowStop: number, maxRowStop: number };

export function findBranches(walker: TableWalker): BranchResult | null {
    //const ui = SpreadsheetApp.getUi();
    if (!walker.value) return null;
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
        let children: Branch[] = [];
        if (region) {
            const nextLevel = findBranches(region);
            if (nextLevel) {
                if (minRowStop < nextLevel.minRowStop)
                    minRowStop = nextLevel.minRowStop;
                if (maxRowStop > nextLevel.maxRowStop)
                    maxRowStop = nextLevel.maxRowStop;
                children = nextLevel.branches;
            } else {
                const dataStart = region.find(1, 0, v => v);
                if (dataStart && dataStart.row < maxRowStop) {
                    maxRowStop = dataStart.row;
                }
            }
        }
        const actualStop = children[children.length - 1]?.stop ?? startPoints[i].col + 1;
        arr.push({
            label: startPoints[i].value,
            row: startPoints[i].row,
            start: startPoints[i].col,
            stop: actualStop,
            children: children,
        })
        // Gaps between branches are only allowed at the top level
        if (!topLevel && stop !== undefined && actualStop < stop) break;
    }
    if (arr.length > 1 && minRowStop < walker.row + 1)
        minRowStop = walker.row + 1;
    return {
        branches: arr,
        minRowStop: minRowStop,
        maxRowStop: maxRowStop,
    };
}

export function getHeaders(walker: TableWalker, obj: MetaTagged): HeaderNode | undefined {
    const { branches, rowStop } = getHeadersHelper(walker);
    return Sheetable.getHeaderTree(obj, branches, rowStop, 'stop');
}

export function getHeadersForClient(walker: TableWalker): Branch[] {
    const { branches, rowStop } = getHeadersHelper(walker);
    trimBranches(branches, rowStop);
    return branches;

    function trimBranches(branches: Branch[], rowStop: number) {
        // assume children at the same level will always be in the same row
        if (branches[0]?.row >= rowStop) {
            branches.length = 0;
            return;
        }
        for (const c of branches) {
            trimBranches(c.children, rowStop);
        }
    }
}

export function getHeadersHelper(walker: TableWalker): { branches: Branch[], rowStop: number } {
    let branches: Branch[] = [];
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