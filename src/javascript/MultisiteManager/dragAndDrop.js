/**
 * Dragging rows between the panes.
 *
 * Through react-dnd rather than the browser's own drag and drop, because jContent mounts an
 * HTML5Backend around the whole application and that backend cancels any drag it does not
 * recognise: its window-level dragstart handler ends with "if by this time no drag source reacted,
 * tell browser not to drag" and calls preventDefault. A plain `draggable` row is silently refused.
 * Registering as a proper drag source is both the fix and the way to coexist with jContent.
 */

import {isStructurallyAllowed} from './transferRules';

export const DRAG_TYPE = 'multisite-manager/nodes';

// What a dragged node may be dropped into. Anything else in a listing is a leaf.
const FOLDER_TYPES = new Set(['jnt:folder', 'jnt:contentFolder', 'jnt:page', 'jnt:contentList']);

export const isFolder = node => FOLDER_TYPES.has(node?.primaryNodeType?.name);

/**
 * Whether these nodes can be dropped into this folder.
 *
 * A drag is always a move, so the move rules apply. Node type checking is deliberately not done
 * here: it would mean a query for every row the pointer crosses. A drop the destination cannot
 * accept is refused by the server and reported in the pane, which is the same answer a moment later.
 */
export const canDropInto = (nodes, destination) => isStructurallyAllowed(nodes, destination, 'cut');

/** The shape put on the clipboard or into a drag, kept small and serialisable. */
export const toDraggable = node => ({
    path: node.path,
    uuid: node.uuid,
    name: node.name,
    displayName: node.displayName
});
