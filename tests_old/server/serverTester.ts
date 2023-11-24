class ServerTester {
    data: ['ok' | 'error', string][] = [];
    status: 'pending' | 'ok' | 'failed' = 'pending';

    log(msg: string) {
        this.data.push(['ok', msg]);
    }

    stringify(val: any) {
        this.log(JSON.stringify(val));
    }

    error(msg: string) {
        this.data.push(['error', msg]);
        this.fail();
    }

    fail() {
        this.status = 'failed';
    }

    pass() {
        if (this.status !== 'failed') {
            this.status = 'ok';
        }
    }

    assert(assertion: boolean, msg: string = 'assertion failed'): boolean {
        if (!assertion) this.error(msg);
        return assertion;
    }

    assertEq(a: any, b: any, msg?: string): boolean {
        if (deepEq(a, b)) return true;
        if (msg === undefined) {
            msg = 'Equality assertion failed'
                + `\nvalue:    ${JSON.stringify(a)}\nexpected: ${JSON.stringify(b)}`;
        }
        this.error(msg);
        return false;

        function deepEq(a: any, b: any): boolean {
            if (typeof a !== typeof b) return false;
            if (typeof a !== 'object') return a === b;
            if (a === null || b === null) return a === b;
            for (const k in a) {
                if (!deepEq(a[k], b[k])) return false;
            }
            return true;
        }
    }

    wrap<F extends (...args: any[]) => any>(callback: F): () => ReturnType<F> {
        return (...args: Parameters<F>) => {
            try {
                return callback(...args);
            } catch(e) {
                this.error(String(e));
                throw e;
            }
        };
    }

    wrapAsync<T, F extends (...args: any[]) => Promise<T>>(callback: F): (...args: Parameters<F>) => Promise<T> {
        const captureThis = this;
        return async function(...args: Parameters<F>) {
            try {
                return await callback(...args);
            } catch(e) {
                captureThis.error(String(e));
                throw e;
            }
        };
    }
}
