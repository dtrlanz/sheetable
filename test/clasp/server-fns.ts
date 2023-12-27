import { ServerFunctions } from "./server-proxy";

export interface SF extends ServerFunctions {
    add(lhs: number, rhs: number): number;
    subtract(lhs: number, rhs: number): number;
}

(globalThis as any).add = add;
export function add(lhs: number, rhs: number) {
    return lhs + rhs;
}

(globalThis as any).subtract = subtract;
export function subtract(lhs: number, rhs: number) {
    return lhs - rhs;
}
