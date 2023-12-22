export function test(name: string, fn: (t: ExecutionContext) => void | Promise<void>) {
    const t = new ExecutionContext();
    (new Promise<void>(res => {
        fn(t);
        res();
    })).catch(reason => {
        console.error(reason);
    });
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