/**
 * Dragging rows between the panes, using the browser's own drag and drop.
 *
 * Not react-dnd, even though jContent mounts a provider this module sits inside: Moonstone's
 * TableRow does not forward a ref, and react-dnd needs one to attach a connector. TableRow does
 * pass through ordinary <tr> props, which is all the native API asks for.
 */

export const DRAG_MIME = 'application/x-jahia-multisite-nodes';

// What a dragged node may be dropped into. Anything else in a listing is a leaf.
const FOLDER_TYPES = new Set(['jnt:folder', 'jnt:contentFolder', 'jnt:page', 'jnt:contentList']);

export const isFolder = node => FOLDER_TYPES.has(node?.primaryNodeType?.name);

export const readPayload = event => {
    try {
        const raw = event.dataTransfer.getData(DRAG_MIME);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('Could not read the dragged selection', e);
        return null;
    }
};

export const writePayload = (event, payload) => {
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
};

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
