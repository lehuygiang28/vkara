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

describe('tv-polyfills leaves the DOM alone', () => {
    it('does not wrap removeChild or insertBefore', () => {
        function removeChild(child: unknown) {
            return child;
        }
        function insertBefore(node: unknown) {
            return node;
        }
        function HostNode() {}
        const proto = HostNode.prototype as {
            removeChild: (child: unknown) => unknown;
            insertBefore: (node: unknown) => unknown;
        };
        proto.removeChild = removeChild;
        proto.insertBefore = insertBefore;
        Object.defineProperty(globalThis, 'Node', {
            configurable: true,
            writable: true,
            value: HostNode,
        });

        runPolyfills();

        expect(proto.removeChild).toBe(removeChild);
        expect(proto.insertBefore).toBe(insertBefore);
    });
});
