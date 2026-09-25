/**
 * Dragging rows between the panes.
 *
 * Through react-dnd rather than the browser's own drag and drop, because jContent mounts an
 * HTML5Backend around the whole application and that backend cancels any drag it does not
 * recognise: its window-level dragstart handler ends with "if by this time no drag source reacted,
 * tell browser not to drag" and calls preventDefault. A plain `draggable` row is silently refused.
 * Registering as a proper drag source is both the fix and the way to coexist with jContent.
 */

export const DRAG_TYPE = 'multisite-manager/nodes';

// What a dragged node may be dropped into. Anything else in a listing is a leaf.
const FOLDER_TYPES = new Set(['jnt:folder', 'jnt:contentFolder', 'jnt:page', 'jnt:contentList']);

export const isFolder = node => FOLDER_TYPES.has(node?.primaryNodeType?.name);

const parentOf = path => path.substring(0, path.lastIndexOf('/'));

/**
 * Whether these nodes can be dropped into this folder.
 *
 * Three refusals, all of which would otherwise ask the server to do something incoherent: dropping
 * something onto itself, dropping a folder inside its own subtree, and dropping something back
 * where it already is.
 */
export const canDropInto = (nodes, destination) => {
    if (!destination || !nodes || nodes.length === 0) {
        return false;
    }

    return nodes.every(node =>
        node.path !== destination &&
        !destination.startsWith(node.path + '/') &&
        parentOf(node.path) !== destination
    );
};

/** The shape put on the clipboard or into a drag, kept small and serialisable. */
export const toDraggable = node => ({
    path: node.path,
    uuid: node.uuid,
    name: node.name,
    displayName: node.displayName
});
