/**
 * Chrome's translator wraps text in <font> after React has rendered it.
 * A later React commit then calls removeChild or insertBefore on a node
 * that is no longer a child, and the page hard-recovers.
 *
 * This is not a TV polyfill. It runs on current browsers, before React.
 */
(function () {
    'use strict';

    if (typeof Node !== 'function' || !Node.prototype) return;

    var originalRemoveChild = Node.prototype.removeChild;
    var originalInsertBefore = Node.prototype.insertBefore;

    Node.prototype.removeChild = function removeChild(child) {
        if (!child || child.parentNode !== this) {
            return child;
        }
        return originalRemoveChild.call(this, child);
    };

    Node.prototype.insertBefore = function insertBefore(node, child) {
        if (child && child.parentNode !== this) {
            return node;
        }
        return originalInsertBefore.call(this, node, child);
    };
})();
