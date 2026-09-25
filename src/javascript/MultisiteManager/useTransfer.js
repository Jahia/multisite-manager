import {useDispatch} from 'react-redux';
import {msFailure, msHighlight, msOpenPaths, msReload} from './MultisiteManager.redux';
import {usePaste} from './usePaste';

/**
 * One way to move content, whichever gesture asked for it.
 *
 * The toolbar and a drag both end in the same place - nodes, a destination, and two panes that may
 * need to re-read themselves - so the sequencing lives here rather than being written twice and
 * drifting apart.
 */
export const useTransfer = () => {
    const dispatch = useDispatch();
    const {paste, pasteAsReference, isPasting} = usePaste();

    /**
     * @param {object} params where things are going
     * @param {{type: string, nodes: Array}} params.clipboard what to transfer, and whether it moves
     * @param {string} params.toPane the pane receiving it
     * @param {string} params.destination path of the folder to put it in
     * @param {string} [params.fromPane] the pane it left, when a move empties it
     * @returns {Promise<{failures: Array, paths: string[]}>} what happened
     */
    const transfer = async ({clipboard, toPane, destination, fromPane, asReferenceTypes}) => {
        // A reference never empties the source, so fromPane is irrelevant to it
        const {failures, paths} = asReferenceTypes ?
            await pasteAsReference(clipboard.nodes, destination, asReferenceTypes) :
            await paste(clipboard, destination);

        // A destination that cannot hold what was dropped is the common failure, and used to be
        // invisible: the server refused, the console recorded it, and the screen said nothing.
        dispatch(msFailure(toPane, failures.length === 0 ? null : {
            count: failures.length,
            destination,
            name: failures[0].node.displayName || failures[0].node.name
        }));

        // Open the destination, so something dropped on a closed folder can be seen landing in it
        // rather than appearing to vanish. Harmless when it was already open, and it also brings
        // the branch's children into the query, which is what the tint needs to have a row to sit
        // on.
        if (paths.length > 0) {
            dispatch(msOpenPaths(toPane, [destination]));
        }

        dispatch(msReload(toPane));

        // Only a move leaves a hole behind, and only if the source is a different pane
        if (!asReferenceTypes && clipboard.type === 'cut' && fromPane && fromPane !== toPane) {
            dispatch(msReload(fromPane));
        }

        if (paths.length > 0) {
            dispatch(msHighlight(toPane, paths));
        }

        return {failures, paths};
    };

    return {transfer, isPasting};
};

export default useTransfer;
