import {useQuery} from '@apollo/client';
import gql from 'graphql-tag';

/**
 * What may be pasted as a reference, and as what.
 *
 * Checked against the repository rather than assumed, because the rules are not obvious:
 *
 *   jnt:contentReference        points at jmix:droppableContent
 *   jnt:fileReference           points at jnt:file
 *   jnt:contentFolderReference  points at jnt:contentFolder
 *
 * So the type follows what is being referenced, not where it is going. Two consequences worth
 * knowing: a media folder (jnt:folder) accepts none of these - it takes files and nothing else, so
 * a reference can never be pasted into one - and anything that is not a file, a content folder or
 * droppable content cannot be referenced at all. A page is the common example.
 *
 * jContent offers only jnt:contentReference, which is why pasting a reference to an image there
 * does not behave as one might expect. This asks the node what it is and picks accordingly.
 */

export const REFERENCE_TYPES = ['jnt:contentReference', 'jnt:fileReference', 'jnt:contentFolderReference'];

const REFERENCE_CHECK = gql`
    query MultisiteReferenceCheck($destination: String!, $sourcePaths: [String!]!) {
        jcr {
            destination: nodeByPath(path: $destination) {
                uuid
                allowedChildNodeTypes { name }
            }
            sources: nodesByPath(paths: $sourcePaths) {
                uuid
                path
                isFile: isNodeType(type: {types: ["jnt:file"]})
                isContentFolder: isNodeType(type: {types: ["jnt:contentFolder"]})
                isDroppable: isNodeType(type: {types: ["jmix:droppableContent"]})
            }
        }
    }
`;

/** The reference type that can point at this node, or null if nothing can. */
export const referenceTypeFor = source => {
    if (source.isFile) {
        return 'jnt:fileReference';
    }

    if (source.isContentFolder) {
        return 'jnt:contentFolderReference';
    }

    // Deliberately last: a node can be droppable content as well as something more specific, and
    // the specific reference type carries more meaning
    return source.isDroppable ? 'jnt:contentReference' : null;
};

/**
 * Whether the clipboard can be pasted into this folder as references, and as which types.
 *
 * @param {string} destination path of the folder being pasted into
 * @param {Array} nodes what is on the clipboard
 * @returns {{loading: boolean, canReference: boolean, reason: string, typeByPath: object}} verdict
 */
export const useReferenceCheck = (destination, nodes) => {
    const paths = (nodes || []).map(node => node.path);
    const skip = !destination || paths.length === 0;

    const {data, loading} = useQuery(REFERENCE_CHECK, {
        variables: {destination: destination || '/', sourcePaths: paths},
        skip,
        fetchPolicy: 'cache-first'
    });

    if (skip || loading || !data) {
        return {loading: !skip && loading, canReference: false, reason: 'none', typeByPath: {}};
    }

    const allowed = new Set((data.jcr?.destination?.allowedChildNodeTypes || []).map(t => t.name));
    const sources = data.jcr?.sources || [];

    const typeByPath = {};
    let reason = '';

    for (const source of sources) {
        const type = referenceTypeFor(source);
        if (!type) {
            // A page, a category, a nav menu entry: nothing references these
            return {loading: false, canReference: false, reason: 'notReferenceable', typeByPath: {}};
        }

        if (!allowed.has(type)) {
            reason = 'destinationRefuses';
            return {loading: false, canReference: false, reason, typeByPath: {}};
        }

        typeByPath[source.path] = type;
    }

    return {loading: false, canReference: sources.length > 0, reason, typeByPath};
};
