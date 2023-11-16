import htm from 'htm';

export const html = htm.bind(h);

function h(type: Component, props: Properties, ...children: any[]) {
    if (typeof type === 'string') {
        const elem = document.createElement(type);
        for (const k in props) {
            elem.setAttribute(k, props[k]);
        }
        elem.replaceChildren(...children);
        return elem;
    }
    return type(props, ...children);
}

type Component = string | CustomComponent;

type CustomComponent = (props: Properties, ...children: any[]) => any;

type Properties = { [k: string]: any };