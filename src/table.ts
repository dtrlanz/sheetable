import { SheetLike } from "./sheet-navigation.js";
import { Constructor } from "./meta-props.js";
import { Orientation } from "./sheet-navigation.js";
import { Value } from "./values.js";
import { SheetClient } from "./sheet-server.js";
import { Index } from "./index.js";
import { Header } from "./headers.js";

type TableOptions = {
    url?: string,
    sheetName?: string,
    context?: { readonly [k: string]: any },
    sharedIndex?: Table<any>,
    client?: SheetClient,
    firstHeaderRow?: number,
    firstDataRow?: number,
    dataRowCount?: number,
    firstColumn?: number,
    columnCount?: number,
    orientation?: Orientation,
    sampleLimit?: number,
};

class Table<T> {
    readonly ctor: Constructor<T>;
    readonly context: { readonly [k: string]: any };
    private readonly client: SheetClient;
    private readonly index: Index<T>;
    private readonly header: Header<T>;
    

    constructor(ctor: Constructor<T>, options?: TableOptions);
    constructor(data: Iterable<T>, options?: TableOptions);
    constructor(data: Constructor<T> | Iterable<T>, options: TableOptions = {}) {
        if (typeof data === 'function') {
            this.ctor = data;
            this.context = options.context ?? {};
        } else {
            let sampleLimit = options.sampleLimit ?? 1;
            if (sampleLimit < 1) throw new Error(`sampleLimit: ${sampleLimit} is invalid; must be >= 1`);
            const samples = [];
            for (const sample of data) {
                samples.push(sample);
                if (--sampleLimit < 1) break;
            }
            if (samples.length < 1) throw new Error('Error constructing Table: data was empty; consider passing a class instead');
            this.ctor = Object.getPrototypeOf(samples[0]).constructor;
            this.header = Header.create(this.ctor, samples, options.context);
            
        }
    }
}