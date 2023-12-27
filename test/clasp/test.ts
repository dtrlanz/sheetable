import diff from "microdiff";

const server = new Proxy({}, {
    get(_target, property) {
        if (typeof property === 'symbol') {
            throw new Error(`Server method names must be strings, not symbols: ${String(property)}`);
        }
        return async function(...args: any[]): Promise<any> {
            let resolve: (value: any) => void;
            let reject: (error: any) => void;
            const p = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            google.script.run
                .withSuccessHandler((value: any) => resolve(value))
                .withFailureHandler((error: any) => reject(error))
                [property](...args);
            return p;
        };
    }
})

export type ServerFunctions = { [key: string]: (...args: any) => any };
type AsyncServerFunctions<SF extends ServerFunctions> = {
    [key in keyof SF]: (...args: Parameters<SF[key]>) => Promise<ReturnType<SF[key]>>
};

export function test<SF extends ServerFunctions = any>(name: string, fn: (t: ExecutionContext, server: AsyncServerFunctions<SF>) => void | Promise<void>) {
    const t = new ExecutionContext();
    const s = server as {
        [key in keyof SF]: (...args: Parameters<SF[key]>) => Promise<ReturnType<SF[key]>>
    };
    (new Promise<void>(res => {
        fn(t, s);
        res();
    })).catch(reason => {
        console.error(reason);
    });
}

let div: HTMLDivElement | undefined;

export function display(elem?: HTMLDivElement | null) {
    div = elem ?? undefined;
}

class ExecutionContext {
    assert(actual: any, message?: string) {
        message ??= 'Assertion failed';
        if (!actual) {
            throw new Error(`${message}\nvalue: ${actual}`);
        }
    }

    is(actual: any, expected: any, message?: string) {
        message ??= 'Equality assertion failed';
        if (actual !== expected) {
            throw new Error(`${message}'\nactual: ${actual}\nexpected: ${expected}`);
        }
    }
}