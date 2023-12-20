import { SheetLike } from "./sheet-navigation.js";
import { Constructor } from "./meta-props.js";
import { Orientation } from "./sheet-navigation.js";
import { Value } from "./values.js";
import { SheetClient } from "./sheet-server.js";
import { Index } from "./index.js";
import { Header } from "./headers.js";
import { getIndexTitles } from "./title.js";

type TableOptions = {
    context?: { readonly [k: string]: any },
    client?: SheetClient,
    url?: string,
    sheetName?: string,
    orientation?: Orientation,
    firstHeaderRow?: number,
    firstDataRow?: number,
    dataRowCount?: number,
    firstColumn?: number,
    columnCount?: number,
    sharedIndex?: Table<any>,
    sampleLimit?: number,
};

class Table<T extends object> {
    readonly ctor: Constructor<T>;
    readonly context: { readonly [k: string]: any };
    private readonly client: SheetClient;
    private readonly index: Index<T>;
    private readonly header: Header<T>;
    

    private constructor(
        ctor: Constructor<T>,
        context: { readonly [k: string]: any },
        client: SheetClient,
        index: Index<T>,
        header: Header<T>
    ) {
        this.ctor = ctor;
        this.context = context;
        this.client = client;
        this.index = index;
        this.header = header;
        
        // if (typeof data === 'function') {
        //     this.ctor = data;
        //     this.context = options.context ?? {};
        // } else {
        //     let sampleLimit = options.sampleLimit ?? 1;
        //     if (sampleLimit < 1) throw new Error(`sampleLimit: ${sampleLimit} is invalid; must be >= 1`);
        //     const samples = [];
        //     for (const sample of data) {
        //         samples.push(sample);
        //         if (--sampleLimit < 1) break;
        //     }
        //     if (samples.length < 1) throw new Error('Error constructing Table: data was empty; consider passing a class instead');
        //     this.ctor = Object.getPrototypeOf(samples[0]).constructor;
        //     this.header = Header.create(this.ctor, samples, options.context);
        // }
    }

    static async open<T extends object>(ctor: Constructor<T>, options?: TableOptions): Promise<Table<T>> {
        const client = options?.client ?? 
            await SheetClient.fromUrl(options?.url, options?.sheetName, options?.orientation);

        const { headers, data } = await client.get(getIndexTitles(ctor));
        if (!data) throw new Error('client failed to return index data');
        const header = Header.open(ctor, headers, options?.context);
        return new Table(
            ctor,
            options?.context ?? {},
            client,
            new Index(ctor, header, data),
            header
        );
    }

    static async create<T extends object>(ctor: Constructor<T>, options?: TableOptions): Promise<Table<T>>;
    static async create<T extends object>(data: Iterable<T>, options?: TableOptions): Promise<Table<T>>;
    static async create<T extends object>(data: Constructor<T> | Iterable<T>, options?: TableOptions): Promise<Table<T>> {
        throw new Error('Table.create() not yet implemented');
    }
}