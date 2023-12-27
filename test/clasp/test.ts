import diff from "microdiff";

let div: HTMLDivElement | undefined;

export function display(elem?: HTMLDivElement | null) {
    div = elem ?? undefined;
    console.log(div);
}

export function test(name: string, fn: (t: ExecutionContext) => void | Promise<void>) {
    let output: HTMLDivElement | undefined;

    setTimeout(run);

    async function run() {
        setStatus('pending');

        const t = new ExecutionContext();

        (async () => await fn(t))()
        .then(() => setStatus('passed'))
        .catch(error => {
            setStatus('failed', error.message);
            if (output) {
                (output.getElementsByClassName('stack')[0] as HTMLDivElement).innerText = error.stack;
                output.getElementsByClassName('values')[0].innerHTML = '<table>' +
                    Object.entries(t.values).map(([k, v]) => 
                        `<tr class="${k}">
                            <th>${k}</th>
                            <td>${v}</td>
                        </tr>`
                    ).join('') + '</table>';
            }
            console.error(error);
        });
    }

    function setStatus(status: 'pending' | 'passed' | 'failed', message?: string) {
        if (div && !output) {
            output = document.createElement('div');
            output.classList.add('test');
            output.innerHTML = `<h1>${name}</h1>
                <div class="result"></div>
                <div class="values"></div>
                <div class="stack"></div>`;
            output.getElementsByTagName('h1')[0]
                .addEventListener('click', () => output?.classList.toggle('collapsed'));
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
        this.values = { actual };
        message ??= 'Assertion failed';
        if (!actual) {
            throw new Error(`${message}\nvalue: ${actual}`);
        }
    }

    is(actual: any, expected: any, message?: string) {
        this.values = { actual, expected };
        message ??= 'Equality assertion failed';
        if (actual !== expected) {
            throw new Error(`${message}\nactual: ${actual}\nexpected: ${expected}`);
        }
    }
}