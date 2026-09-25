/**
 * Flattening the tree the query returns into rows that can be drawn.
 *
 * The structured query only descends into paths that are open, so the shape it returns is already
 * the shape on screen - this just walks it and records how deep each node sits.
 */
export const flattenTree = (nodes, depth = 0) => (nodes || []).reduce((rows, node) => {
    rows.push({node, depth, hasChildren: Boolean(node.hasSubRows)});
    if (node.subRows?.length > 0) {
        rows.push(...flattenTree(node.subRows, depth + 1));
    }

    return rows;
}, []);
