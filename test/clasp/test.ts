let div: HTMLDivElement | undefined;

export function display(elem?: HTMLDivElement | null) {
    div = elem ?? undefined;
    console.log(div);
}

export function test(name: string, fn: (t: ExecutionContext) => void | Promise<void>) {
    let output: HTMLDivElement | undefined;

    setTimeout(run);

    function run() {
        setStatus('pending');

        const t = new ExecutionContext();

        (async () => await fn(t))()
        .then(() => setStatus('passed'))
        .catch(error => {
            setStatus('failed', error.message);
            if (output) {
                (output.getElementsByClassName('stack')[0] as HTMLDivElement).innerText = error.stack;
                output.getElementsByClassName('values')[0].innerHTML = `<table>${
                    Object.entries(t.values).map(([k, v]) => 
                        `<tr class="${k}">
                            <th>${k}</th>
                            <td>${JSON.stringify(v)}</td>
                        </tr>`
                    ).join('')}</table>`;
            }
        });
    }

    function setStatus(status: 'pending' | 'passed' | 'failed', message?: string) {
        if (div && !output) {
            output = document.createElement('div');
            output.classList.add('test');
            output.innerHTML = `<h1>${name}</h1>
                <div class="result"></div>
                <div class="values"></div>
                <div class="options"><a href="#">run again</a></div>
                <div class="stack"></div>`;
            output.getElementsByTagName('h1')[0]
                .addEventListener('click', () => output?.classList.toggle('collapsed'));
            const rerun = output.getElementsByTagName('a')[0] as HTMLAnchorElement;
            rerun.addEventListener('click', () => {
                output!.getElementsByClassName('values')[0].innerHTML = '';
                output!.getElementsByClassName('stack')[0].innerHTML = '';
                run();
            });
            div.appendChild(output);
        }
        if (!output) return;
        output.classList.remove('pending', 'passed', 'failed', 'collapsed');
        output.classList.add(status);
        if (status === 'passed') output.classList.add('collapsed');
        output.getElementsByClassName('result')[0].textContent = message ?? status;
    }
}

class ExecutionContext {
    values = {};

    assert(actual: any, message?: string) {
        if (actual) return;
        this.values = { value: actual };
        message ??= 'Assertion failed';
        console.error(message);
        throw new Error(message);
    }

    is(actual: any, expected: any, message?: string) {
        if (actual === expected) return;
        this.values = { actual, expected };
        message ??= 'Equality assertion failed';
        console.error(message);
        throw new Error(message);
    }

    deepEqual(actual: any, expected:any, message?: string) {
        const log: { method: string, args: any[] }[] = [];
        if (diff(undefined, actual, expected, log)) return;
        message ??= 'Deep equality assertion failed';
        console.error(message);
        for (const line of log) {
            (console as any)[line.method](...line.args);
        }
        this.values = { actual, expected };
        throw new Error(message);
    }
}

function diff(key: string | number | undefined, actual: any, expected: any, log: { method: string, args: any[] }[] ): boolean {
    if (typeof actual !== 'object' || !actual) {
        if (actual === expected) {
            log.push({
                method: 'log',
                args: [key !== undefined ? `${key}: ${String(actual)}` : String(actual)],
            });
            return true;
        };
        let str = '';
        let styles = [];
        if (actual !== undefined) {
            str = (key !== undefined ? `%c${key}: ${String(actual)}` : `%c${String(actual)}`) + '\n';
            styles.push('color: red;');
        }
        if (expected !== undefined) {
            str += key !== undefined ? `%c${key}: ${String(expected)}` : `%c${String(expected)}`;
            styles.push('color: green;');
        }
        log.push({ method: 'log', args: [str.trimEnd(), ...styles] });
        return false;
    }
    const groupIdx = log.length;
    let equal = true;
    if (Array.isArray(actual)) {
        for (let i = 0; i < actual.length; i++) {
            // do not short-circuit recursion
            equal = diff(i, actual[i], expected[i], log) && equal;
        }
        for (let i = actual.length; i < expected.length; i++) {
            equal = diff(i, undefined, expected[i], log) && equal;
        }
    } else {
        const actualKeys = new Set();
        for (const k in actual) {
            actualKeys.add(k);
            equal = diff(k, actual[k], expected[k], log) && equal;
        }
        for (const k in expected) {
            if (actualKeys.has(k)) continue;
            equal = diff(k, undefined, expected[k], log) && equal;
        }    
    }
    log.splice(groupIdx, 0, { 
        method: equal ? 'groupCollapsed' : 'group', 
        args: [key ?? Object.getPrototypeOf(actual).constructor.name],
    });
    log.push({ method: 'groupEnd', args: [] });
    return equal;
}