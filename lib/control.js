export function createControl(id, ariaLabelledBy, type) {
    const control = document.createElement('input');
    control.setAttribute('id', id);
    if (ariaLabelledBy) {
        control.setAttribute('aria-labelledby', ariaLabelledBy);
    }
    if (type === Number || type === BigInt) {
        control.setAttribute('type', 'number');
        control.setAttribute('step', 'any');
    }
    else {
        control.setAttribute('type', 'text');
    }
    return control;
}
