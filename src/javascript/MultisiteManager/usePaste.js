import {useState} from 'react';
import {useApolloClient} from '@apollo/client';
import gql from 'graphql-tag';

/**
 * Copying and moving between sites.
 *
 * pasteNode takes two paths and no site, and the server checks only whether the destination accepts
 * the type - so crossing a site boundary is not a special case here, it is the ordinary operation
 * with paths that happen to start differently.
 *
 * References are deliberately left pointing at the source site. A copied item that refers to a
 * category or an image keeps referring to the original, which is the agreed behaviour: rewriting
 * them would be a different feature with different risks.
 *
 * Two documents rather than one with a mode variable, mirroring jContent, because the mode is a
 * GraphQL enum and spelling it in the document avoids depending on the enum's type name.
 */
const COPY_NODE = gql`
    mutation multisiteCopyNode($pathOrId: String!, $destParentPathOrId: String!) {
        jcr {
            pasteNode(mode: COPY, pathOrId: $pathOrId, destParentPathOrId: $destParentPathOrId, namingConflictResolution: RENAME) {
                node { uuid path }
            }
        }
    }
`;

const MOVE_NODE = gql`
    mutation multisiteMoveNode($pathOrId: String!, $destParentPathOrId: String!) {
        jcr {
            pasteNode(mode: MOVE, pathOrId: $pathOrId, destParentPathOrId: $destParentPathOrId, namingConflictResolution: RENAME) {
                node { uuid path }
            }
        }
    }
`;

export const usePaste = () => {
    const client = useApolloClient();
    const [isPasting, setIsPasting] = useState(false);

    /**
     * @param {{type: string, nodes: Array}} clipboard what was copied or cut
     * @param {string} destination path of the folder to paste into
     * @returns {Promise<{pasted: number, failures: Array, paths: string[]}>} what happened, and
     *          where each node landed - the server renames on conflict, so the destination path is
     *          not something the caller could have worked out
     */
    const paste = async (clipboard, destination) => {
        setIsPasting(true);
        const mutation = clipboard.type === 'cut' ? MOVE_NODE : COPY_NODE;
        const failures = [];
        const paths = [];
        let pasted = 0;

        // One at a time rather than in parallel: a move renames on conflict, and concurrent pastes
        // into the same folder would race over the names they are given.
        for (const node of clipboard.nodes) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const {data} = await client.mutate({
                    mutation,
                    variables: {pathOrId: node.path, destParentPathOrId: destination}
                });
                const landed = data?.jcr?.pasteNode?.node?.path;
                if (landed) {
                    paths.push(landed);
                }

                pasted += 1;
            } catch (e) {
                console.error('Could not paste ' + node.path + ' into ' + destination, e);
                failures.push({node, error: e});
            }
        }

        setIsPasting(false);
        return {pasted, failures, paths};
    };

    return {paste, isPasting};
};

export default usePaste;
