export const server = new Proxy({}, {
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
}) as ServerFunctions;

export type ServerFunctions = { 
    [key: string]: (...args: any) => any 
};

export type TypedServer<SF extends ServerFunctions> = {
    [key in keyof SF]: (...args: Parameters<SF[key]>) => Promise<ReturnType<SF[key]>>
};
