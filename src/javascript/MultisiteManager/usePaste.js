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

/**
 * A reference is a new node of a reference type whose j:node points back at the original, which is
 * why this is an addNode rather than a pasteNode. Mirrors jContent's own mutation, including
 * passing the source path as the weak reference value and letting the server pick a free name.
 */
const PASTE_REFERENCE = gql`
    mutation multisitePasteReference($pathOrId: String!, $destParentPathOrId: String!, $destName: String!, $referenceType: String!) {
        jcr {
            pasteNode: addNode(name: $destName, primaryNodeType: $referenceType, parentPathOrId: $destParentPathOrId, useAvailableNodeName: true) {
                mutateProperty(name: "j:node") {
                    setValue(value: $pathOrId)
                }
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

    /**
     * Paste references to the clipboard rather than the things themselves.
     *
     * @param {Array} nodes what to reference
     * @param {string} destination path of the folder to create the references in
     * @param {object} typeByPath the reference type for each node, from the rules check
     * @returns {Promise<{pasted: number, failures: Array, paths: string[]}>} what happened
     */
    const pasteAsReference = async (nodes, destination, typeByPath) => {
        setIsPasting(true);
        const failures = [];
        const paths = [];
        let pasted = 0;

        for (const node of nodes) {
            const referenceType = typeByPath[node.path];
            if (!referenceType) {
                failures.push({node, error: new Error('Nothing can reference ' + node.path)});
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const {data} = await client.mutate({
                    mutation: PASTE_REFERENCE,
                    variables: {
                        pathOrId: node.path,
                        destParentPathOrId: destination,
                        destName: node.name,
                        referenceType
                    }
                });
                const landed = data?.jcr?.pasteNode?.node?.path;
                if (landed) {
                    paths.push(landed);
                }

                pasted += 1;
            } catch (e) {
                console.error('Could not reference ' + node.path + ' in ' + destination, e);
                failures.push({node, error: e});
            }
        }

        setIsPasting(false);
        return {pasted, failures, paths};
    };

    return {paste, pasteAsReference, isPasting};
};

export default usePaste;
