/**
 * Flattening the tree the query returns into rows that can be drawn.
 *
 * The structured query only descends into paths that are open, so the shape it returns is already
 * the shape on screen - this just walks it and records how deep each node sits.
 */

/**
 * The order jContent puts these in: Pages, then Content folders, then Media.
 *
 * By type rather than by name, because the home page is not called "home" on every site, and a
 * site can hold more than one page at its root.
 */
const TOP_LEVEL_ORDER = ['jnt:page', 'jnt:contentFolder', 'jnt:folder'];

const rankOf = node => {
    const rank = TOP_LEVEL_ORDER.indexOf(node.primaryNodeType?.name);
    // Anything jContent has no accordion for goes after the three it does
    return rank === -1 ? TOP_LEVEL_ORDER.length : rank;
};

const byJContentOrder = (a, b) =>
    rankOf(a) - rankOf(b) ||
    (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '');

/** Only the site's own children are reordered; deeper levels keep the query's alphabetical sort. */
export const orderTopLevel = nodes => [...(nodes || [])].sort(byJContentOrder);

export const flattenTree = (nodes, depth = 0) => (nodes || []).reduce((rows, node) => {
    rows.push({node, depth, hasChildren: Boolean(node.hasSubRows)});

    if (node.subRows?.length > 0) {
        const children = depth === 0 ? orderTopLevel(node.subRows) : node.subRows;
        rows.push(...flattenTree(children, depth + 1));
    }

    return rows;
}, []);
