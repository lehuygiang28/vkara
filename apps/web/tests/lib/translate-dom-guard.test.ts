import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const guardSource = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/translate-dom-guard.js'),
    'utf8',
);

const originalNode = (globalThis as { Node?: unknown }).Node;

afterEach(() => {
    if (originalNode === undefined) {
        Reflect.deleteProperty(globalThis, 'Node');
    } else {
        Object.defineProperty(globalThis, 'Node', {
            configurable: true,
            writable: true,
            value: originalNode,
        });
    }
});

type DomNode = {
    nodeName: string;
    parentNode: DomNode | null;
    childNodes: DomNode[];
    appendChild(child: DomNode): DomNode;
    removeChild(child: DomNode): DomNode;
    insertBefore(node: DomNode, child: DomNode | null): DomNode;
};

function notFound(): Error {
    const error = new Error('The object can not be found here.');
    error.name = 'NotFoundError';
    return error;
}

function installTranslatedDom() {
    class TranslatedNode implements DomNode {
        parentNode: DomNode | null = null;
        childNodes: DomNode[] = [];

        constructor(readonly nodeName: string) {}

        appendChild(child: DomNode): DomNode {
            if (child.parentNode) {
                child.parentNode.removeChild(child);
            }
            child.parentNode = this;
            this.childNodes.push(child);
            return child;
        }

        removeChild(child: DomNode): DomNode {
            if (child.parentNode !== this) {
                throw notFound();
            }
            this.childNodes = this.childNodes.filter((node) => node !== child);
            child.parentNode = null;
            return child;
        }

        insertBefore(node: DomNode, child: DomNode | null): DomNode {
            if (child && child.parentNode !== this) {
                throw notFound();
            }
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
            node.parentNode = this;
            if (!child) {
                this.childNodes.push(node);
                return node;
            }
            const index = this.childNodes.indexOf(child);
            this.childNodes.splice(index, 0, node);
            return node;
        }
    }

    Object.defineProperty(globalThis, 'Node', {
        configurable: true,
        writable: true,
        value: TranslatedNode,
    });

    return TranslatedNode;
}

function wrapLikeTranslate(parent: DomNode, child: DomNode): DomNode {
    const NodeCtor = (globalThis as unknown as { Node: new (name: string) => DomNode }).Node;
    const font = new NodeCtor('FONT');
    parent.childNodes = parent.childNodes.filter((node) => node !== child);
    child.parentNode = font;
    font.childNodes.push(child);
    font.parentNode = parent;
    parent.childNodes.push(font);
    return font;
}

function runGuard() {
    vm.runInThisContext(guardSource, { filename: 'translate-dom-guard.js' });
}

describe('translate DOM guard', () => {
    it('removeChild of a node Chrome wrapped in font does not throw', () => {
        const NodeCtor = installTranslatedDom();
        runGuard();

        const parent = new NodeCtor('DIV');
        const text = new NodeCtor('#text');
        parent.appendChild(text);
        wrapLikeTranslate(parent, text);

        expect(text.parentNode?.nodeName).toBe('FONT');
        expect(() => parent.removeChild(text)).not.toThrow();
        expect(text.parentNode?.nodeName).toBe('FONT');
    });

    it('removeChild still detaches a node that is actually a child', () => {
        const NodeCtor = installTranslatedDom();
        runGuard();

        const parent = new NodeCtor('DIV');
        const text = new NodeCtor('#text');
        parent.appendChild(text);

        expect(parent.removeChild(text)).toBe(text);
        expect(text.parentNode).toBeNull();
        expect(parent.childNodes).not.toContain(text);
    });

    it('insertBefore a reference node that was reparented does not throw', () => {
        const NodeCtor = installTranslatedDom();
        runGuard();

        const parent = new NodeCtor('DIV');
        const anchor = new NodeCtor('#text');
        const incoming = new NodeCtor('#text');
        parent.appendChild(anchor);
        wrapLikeTranslate(parent, anchor);

        expect(() => parent.insertBefore(incoming, anchor)).not.toThrow();
        expect(incoming.parentNode).toBeNull();
        expect(anchor.parentNode?.nodeName).toBe('FONT');
    });

    it('insertBefore still inserts before a real child', () => {
        const NodeCtor = installTranslatedDom();
        runGuard();

        const parent = new NodeCtor('DIV');
        const anchor = new NodeCtor('#text');
        const incoming = new NodeCtor('SPAN');
        parent.appendChild(anchor);

        parent.insertBefore(incoming, anchor);

        expect(parent.childNodes.map((node) => node.nodeName)).toEqual(['SPAN', '#text']);
        expect(incoming.parentNode).toBe(parent);
    });
});
