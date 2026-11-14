import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const polyfillSource = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/tv-polyfills.js'),
    'utf8',
);

type MqlEventTarget = {
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
};

const originalPluralRules = Intl.PluralRules;
const originalWindow = (globalThis as { window?: Window & typeof globalThis }).window;

function ensureWindow() {
    if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
        (globalThis as { window: typeof globalThis }).window = globalThis;
    }
    const win = (globalThis as { window: { crypto?: Crypto } }).window;
    if (!win.crypto) {
        Object.defineProperty(win, 'crypto', {
            configurable: true,
            value: {
                getRandomValues(bytes: Uint8Array) {
                    for (let i = 0; i < bytes.length; i++) bytes[i] = i;
                    return bytes;
                },
            },
        });
    }
}

function runPolyfills() {
    ensureWindow();
    vm.runInThisContext(polyfillSource, { filename: 'tv-polyfills.js' });
}

const originalAllSettled = Promise.allSettled;
const originalNode = (globalThis as { Node?: unknown }).Node;

afterEach(() => {
    Object.defineProperty(Intl, 'PluralRules', {
        configurable: true,
        writable: true,
        value: originalPluralRules,
    });
    Object.defineProperty(Promise, 'allSettled', {
        configurable: true,
        writable: true,
        value: originalAllSettled,
    });
    if (originalWindow === undefined) {
        Reflect.deleteProperty(globalThis, 'window');
    }
    if (originalNode === undefined) {
        Reflect.deleteProperty(globalThis, 'Node');
    } else {
        Object.defineProperty(globalThis, 'Node', {
            configurable: true,
            writable: true,
            value: originalNode,
        });
    }
    Reflect.deleteProperty(globalThis, 'MediaQueryList');
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

describe('tv-polyfills Intl.PluralRules', () => {
    it('defines select() → other when PluralRules is missing', () => {
        Object.defineProperty(Intl, 'PluralRules', {
            configurable: true,
            writable: true,
            value: undefined,
        });

        runPolyfills();

        expect(typeof Intl.PluralRules).toBe('function');
        expect(new Intl.PluralRules('en').select(1)).toBe('other');
        expect(new Intl.PluralRules('vi').select(2)).toBe('other');
    });

    it('does not replace a native PluralRules constructor', () => {
        function NativePluralRules() {
            /* marker */
        }
        NativePluralRules.prototype.select = () => 'one';
        Object.defineProperty(Intl, 'PluralRules', {
            configurable: true,
            writable: true,
            value: NativePluralRules,
        });

        runPolyfills();

        expect(Intl.PluralRules).toBe(NativePluralRules);
        expect(new Intl.PluralRules('en').select(1)).toBe('one');
    });
});

describe('tv-polyfills MediaQueryList', () => {
    it('forwards change listeners to addListener when addEventListener is missing', () => {
        const added: unknown[] = [];
        const removed: unknown[] = [];

        class LegacyMediaQueryList {
            addListener(listener: unknown) {
                added.push(listener);
            }
            removeListener(listener: unknown) {
                removed.push(listener);
            }
        }

        Object.defineProperty(globalThis, 'MediaQueryList', {
            configurable: true,
            writable: true,
            value: LegacyMediaQueryList,
        });

        runPolyfills();

        const mq = new LegacyMediaQueryList() as LegacyMediaQueryList & MqlEventTarget;
        const fn = () => undefined;
        mq.addEventListener('change', fn);
        mq.removeEventListener('change', fn);

        expect(added).toEqual([fn]);
        expect(removed).toEqual([fn]);
    });

    it('does not replace native addEventListener', () => {
        const nativeAdd = function addEventListener() {
            /* marker */
        };

        class ModernMediaQueryList {
            addListener() {
                throw new Error('addListener should not run');
            }
        }
        (ModernMediaQueryList.prototype as ModernMediaQueryList & MqlEventTarget).addEventListener =
            nativeAdd;

        Object.defineProperty(globalThis, 'MediaQueryList', {
            configurable: true,
            writable: true,
            value: ModernMediaQueryList,
        });

        runPolyfills();

        expect(
            (ModernMediaQueryList.prototype as ModernMediaQueryList & MqlEventTarget)
                .addEventListener,
        ).toBe(nativeAdd);
    });
});

describe('tv-polyfills Promise.allSettled', () => {
    it('settles mixed results when the engine has no Promise.allSettled', async () => {
        Object.defineProperty(Promise, 'allSettled', {
            configurable: true,
            writable: true,
            value: undefined,
        });

        runPolyfills();

        const rejected = Promise.reject(new Error('nope'));
        void rejected.catch(() => undefined);
        const settled = await Promise.allSettled([Promise.resolve('ok'), rejected, 3]);

        expect(settled).toEqual([
            { status: 'fulfilled', value: 'ok' },
            { status: 'rejected', reason: expect.objectContaining({ message: 'nope' }) },
            { status: 'fulfilled', value: 3 },
        ]);
    });

    it('does not replace a native Promise.allSettled', () => {
        const native = Promise.allSettled;
        runPolyfills();
        expect(Promise.allSettled).toBe(native);
    });
});

describe('tv-polyfills translated DOM', () => {
    it('removeChild of a node Chrome wrapped in font does not throw', () => {
        const NodeCtor = installTranslatedDom();
        runPolyfills();

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
        runPolyfills();

        const parent = new NodeCtor('DIV');
        const text = new NodeCtor('#text');
        parent.appendChild(text);

        expect(parent.removeChild(text)).toBe(text);
        expect(text.parentNode).toBeNull();
        expect(parent.childNodes).not.toContain(text);
    });

    it('insertBefore a reference node that was reparented does not throw', () => {
        const NodeCtor = installTranslatedDom();
        runPolyfills();

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
        runPolyfills();

        const parent = new NodeCtor('DIV');
        const anchor = new NodeCtor('#text');
        const incoming = new NodeCtor('SPAN');
        parent.appendChild(anchor);

        parent.insertBefore(incoming, anchor);

        expect(parent.childNodes.map((node) => node.nodeName)).toEqual(['SPAN', '#text']);
        expect(incoming.parentNode).toBe(parent);
    });
});
