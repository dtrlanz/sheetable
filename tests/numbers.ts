class ComplexNumber {
    real: number = 0;
    imag: number = 0;

    static fromScalar(val: Sheetable.Scalar): ComplexNumber | undefined {
        if (typeof val === 'number') {
            const n = new ComplexNumber();
            n.real = val;
            return n;
        } else if (typeof val === 'string') {
            switch (val.toLocaleLowerCase()) {
                case 'one': return ComplexNumber.fromScalar(1);
                case 'two': return ComplexNumber.fromScalar(2);
                case 'three': return ComplexNumber.fromScalar(3);
                case 'four': return ComplexNumber.fromScalar(4);
                default:
                    try {
                        const parsed = JSON.parse(val);
                        if (parsed && 'real' in parsed && 'imag' in parsed) {
                            const n = new ComplexNumber();
                            n.real = parsed.real;
                            n.imag = parsed.imag;
                            return n;
                        }
                    } catch (_) {
                        return undefined;
                    }
            }
        }
    }

    toScalar(): number | string {
        if (this.imag === 0) {
            return this.real;
        } else {
            return JSON.stringify(this);
        }
    }
}

class Variable {
    static Table = Sheetable.table(Variable);

    @Sheetable.index @Sheetable.label('variable name')
    name: string = '';

    @Sheetable.ctor(ComplexNumber)
    value: ComplexNumber | undefined;
}