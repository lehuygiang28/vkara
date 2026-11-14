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

    /* The node Chrome moved may sit under <font> inside this parent.
       Act on that ancestor. A node in some other parent is left alone. */
    function ancestorOwnedBy(parent, node) {
        var current = node;
        var hops = 0;
        while (current && current.parentNode !== parent && hops < 32) {
            current = current.parentNode;
            hops += 1;
        }
        if (current && current.parentNode === parent) return current;
        return null;
    }

    Node.prototype.removeChild = function removeChild(child) {
        if (!child) return child;
        if (child.parentNode === this) return originalRemoveChild.call(this, child);
        var owned = ancestorOwnedBy(this, child);
        if (!owned) return child;
        return originalRemoveChild.call(this, owned);
    };

    Node.prototype.insertBefore = function insertBefore(node, child) {
        if (!child || child.parentNode === this) return originalInsertBefore.call(this, node, child);
        var owned = ancestorOwnedBy(this, child);
        if (!owned) return node;
        return originalInsertBefore.call(this, node, owned);
    };
})();
