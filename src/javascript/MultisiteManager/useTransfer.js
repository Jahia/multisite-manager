import {useDispatch} from 'react-redux';
import {msHighlight, msReload} from './MultisiteManager.redux';
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
    const {paste, isPasting} = usePaste();

    /**
     * @param {object} params where things are going
     * @param {{type: string, nodes: Array}} params.clipboard what to transfer, and whether it moves
     * @param {string} params.toPane the pane receiving it
     * @param {string} params.destination path of the folder to put it in
     * @param {string} [params.fromPane] the pane it left, when a move empties it
     * @returns {Promise<{failures: Array, paths: string[]}>} what happened
     */
    const transfer = async ({clipboard, toPane, destination, fromPane}) => {
        const {failures, paths} = await paste(clipboard, destination);

        dispatch(msReload(toPane));

        // Only a move leaves a hole behind, and only if the source is a different pane
        if (clipboard.type === 'cut' && fromPane && fromPane !== toPane) {
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
