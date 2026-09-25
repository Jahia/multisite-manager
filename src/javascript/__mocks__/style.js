/* Style modules resolve to class-name strings under jest; the specs never assert on them. */
module.exports = new Proxy({}, {get: (target, key) => String(key)});
