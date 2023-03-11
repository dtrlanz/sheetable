
class Tester {
    div: HTMLDivElement;
    status: HTMLSpanElement;
    body: HTMLDivElement;

    constructor(name: string) {
        let header;
        this.div = createElement('div', ['test'], [
            header = createElement('p', ['test-header'], [
                createElement('span', [], name + ' '),
                this.status = createElement('span', ['test-status'], '...')
            ]),
            this.body = createElement('div', ['test-body', 'hidden'], [])
        ]);
        header.addEventListener('click', () => this.body.classList.toggle('hidden'));
        document.getElementById('test-output')?.appendChild(this.div);
    }

    log(msg: string) {
        this.body.appendChild(
            createElement('p', [], msg)
        );
    }

    error(msg: string) {
        this.body.appendChild(
            createElement('p', ['error'], msg)
        );
        this.fail();
    }

    fail() {
        this.status.innerText = 'failed';
        this.div.classList.add('failed');
        this.body.classList.remove('hidden');
    }

    pass() {
        if (this.status.innerText !== 'failed') {
            this.status.innerText = 'ok';
            this.div.classList.add('passed');
        }
    }

    assert(assertion: boolean, msg: string = 'assertion failed') {
        if (!assertion) this.error(msg);
    }

    assertEq(a: any, b: any, msg: string | undefined) {
        if (deepEq(a, b)) return;
        if (msg === undefined) {
            msg = 'Equality assertion failed:';
            if (typeof a !== 'object' || typeof b !== 'object') {
                msg += ` ${a} !== ${b}`;
            } else {
                msg += `\n${JSON.stringify(a)}\n${JSON.stringify(b)}`;
            }
        }
        this.error(msg);

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

    wrap<T, P extends []>(callback: (...args: P) => T): () => T {
        return (...args: P) => {
            try {
                return callback(...args);
            } catch(e) {
                this.error(String(e));
                throw e;
            }
        };
    }

    wrapAsync<T, P extends []>(callback: (...args: P) => Promise<T>): () => Promise<T> {
        const captureThis = this;
        return async function(...args: P) {
            try {
                return await callback(...args);
            } catch(e) {
                captureThis.error(String(e));
                throw e;
            }
        };
    }
}

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, classes: string[], contents: string | HTMLElement[]): HTMLElementTagNameMap[K] {
    const elem = document.createElement(tag);
    elem.classList.add(...classes);
    if (Array.isArray(contents)) {
        for (const c of contents) {
            elem.appendChild(c);
        }
    } else {
        elem.innerText = contents;
    }
    return elem;
}