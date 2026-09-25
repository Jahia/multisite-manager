import {useState} from 'react';
import {useApolloClient} from '@apollo/client';
import {useDispatch} from 'react-redux';
import gql from 'graphql-tag';
import {msClearUndo, msHighlight, msOpenPaths, msReload} from './MultisiteManager.redux';

/**
 * Taking back the last transfer.
 *
 * One level, and only the last one: a deeper stack would have to cope with the repository changing
 * underneath it between steps, and the honest limit of a snapshot taken at one moment is one step.
 *
 * What "undo" means depends on what was done, which is why the snapshot records a kind:
 *
 *  - a move is its own inverse, so the nodes go back to the parent they came from;
 *  - a copy or a reference created something that did not exist before, so undoing it is removing
 *    that thing - permanently, since it has existed for seconds and marking it for deletion would
 *    leave a tombstone to clean up.
 *
 * Nodes are held by uuid rather than path, because the path is exactly what the transfer changed,
 * and the server renames on conflict.
 */

const MOVE_BACK = gql`
    mutation multisiteUndoMove($pathOrId: String!, $destParentPathOrId: String!) {
        jcr {
            pasteNode(mode: MOVE, pathOrId: $pathOrId, destParentPathOrId: $destParentPathOrId, namingConflictResolution: RENAME) {
                node { uuid path }
            }
        }
    }
`;

const DELETE_NODE = gql`
    mutation multisiteUndoCreate($pathOrId: String!) {
        jcr {
            deleteNode(pathOrId: $pathOrId)
        }
    }
`;

export const useUndo = () => {
    const client = useApolloClient();
    const dispatch = useDispatch();
    const [isUndoing, setIsUndoing] = useState(false);

    /**
     * @param {object} snapshot what the last transfer did
     * @returns {Promise<{failures: Array}>} what could not be taken back
     */
    const undo = async snapshot => {
        if (!snapshot || snapshot.entries.length === 0) {
            return {failures: []};
        }

        setIsUndoing(true);
        const failures = [];
        const restored = [];

        for (const entry of snapshot.entries) {
            try {
                if (snapshot.kind === 'move') {
                    // eslint-disable-next-line no-await-in-loop
                    await client.mutate({
                        mutation: MOVE_BACK,
                        variables: {pathOrId: entry.uuid, destParentPathOrId: entry.previousParent}
                    });
                    restored.push(entry.previousParent);
                } else {
                    // eslint-disable-next-line no-await-in-loop
                    await client.mutate({mutation: DELETE_NODE, variables: {pathOrId: entry.uuid}});
                }
            } catch (e) {
                console.error('Could not undo the transfer of ' + entry.path, e);
                failures.push({entry, error: e});
            }
        }

        // Show where things landed again, the same way a transfer does
        if (snapshot.kind === 'move' && restored.length > 0 && snapshot.fromPane) {
            dispatch(msOpenPaths(snapshot.fromPane, [...new Set(restored)]));
            dispatch(msReload(snapshot.fromPane));
        }

        dispatch(msHighlight(snapshot.pane, []));
        dispatch(msReload(snapshot.pane));

        // The control goes only when it worked: a failure that was momentary can be tried again,
        // and clearing it would take away the only way back
        if (failures.length === 0) {
            dispatch(msClearUndo());
        }

        setIsUndoing(false);
        return {failures};
    };

    return {undo, isUndoing};
};

export default useUndo;
