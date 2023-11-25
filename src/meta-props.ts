
const META: unique symbol = Symbol('META');

export class MetaProperty {
    private static metaPropCount = 0;
    private static metaPropKeys = new Map<string, number>();
    
    private readonly metaPropIdx: number;
    private readonly metaPropKey: number;
    private readonly metaPropKeyFallback?: number;
    readonly description?: string;

    private constructor(metaPropIdx: number, flag: string, description?: string) {
        this.metaPropIdx = metaPropIdx;
        this.description = description;
        const id = getId(flag);
        let key = MetaProperty.metaPropKeys.get(id);
        if (key === undefined) {
            key = MetaProperty.metaPropKeys.size;
            MetaProperty.metaPropKeys.set(id, key);
        }
        this.metaPropKey = key;
        if (flag !== '') {
            this.metaPropKeyFallback = MetaProperty.metaPropKeys.get(getId(''));
        }

        function getId(flag: string) {
            return `${metaPropIdx} ${flag}`;
        }
    }

    static create(description?: string): MetaProperty {
        return new MetaProperty(MetaProperty.metaPropCount++, '', description);
    }

    flag(flag: string): MetaProperty {
        return new MetaProperty(this.metaPropIdx, flag, this.description);
    }

    with(obj: Constructor): MetaPropertyAccess;
    with(obj: Constructor, key: string | symbol): MetaPropertyAccess;
    with(obj: object): MetaPropertyReadonly;
    with(obj: object, key: string | symbol): MetaPropertyReadonly;
    with(obj: object | Constructor, key?: string | symbol): MetaPropertyAccess | MetaPropertyReadonly {
        const ctor = typeof obj === 'function' ? obj : Object.getPrototypeOf(obj).constructor;
        if (!Object.hasOwn(ctor, META)) {
            ctor[META] = new Map();
        }
        const metaPropDataStore: Map<number, MetaPropertyData> = ctor[META];
        let primary = metaPropDataStore.get(this.metaPropKey);
        if (!primary) {
            primary = {};
            metaPropDataStore.set(this.metaPropKey, primary);
        }
        const fallback = this.metaPropKeyFallback !== undefined
            ? metaPropDataStore.get(this.metaPropKeyFallback)
            : undefined;

        
        if (typeof obj === 'function') {
            return new MetaPropertyAccess(key ?? META, primary, fallback);
        } else {
            // instances should not modify meta props
            const readonly = new MetaPropertyAccess(key ?? META, primary, fallback);
            readonly.set = () => {
                throw new TypeError('Cannot modify meta properties from instance. Use constructor instead.')
            };
            return readonly;
        }
    }
}

type MetaPropertyData = { [k: string | symbol]: any };

type Constructor = new (...args: any[]) => any;

interface MetaPropertyReadonly {
    get(): any;
}

class MetaPropertyAccess {
    private objectKey: string | symbol;
    private primary: MetaPropertyData;
    private fallback?: MetaPropertyData;

    constructor(objectKey: string | symbol, primary: MetaPropertyData, fallback?: MetaPropertyData) {
        this.primary = primary;
        this.fallback = fallback;
        this.objectKey = objectKey;
    }

    get(): any {
        return Object.hasOwn(this.primary, this.objectKey)
            ? this.primary[this.objectKey]
            : this.fallback?.[this.objectKey];
    }

    set(value: any) {
        this.primary[this.objectKey] = value;
    }
}

