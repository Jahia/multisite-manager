import {useQuery} from '@apollo/client';
import gql from 'graphql-tag';

/**
 * What may be pasted where, asked of the repository rather than guessed.
 *
 * Two separate questions, sharing the destination's list of allowed children:
 *
 *  - a plain paste needs the thing itself to be an allowed child of the folder;
 *  - a reference paste needs a *reference type* to be an allowed child, and that type follows what
 *    is being referenced:
 *
 *        jnt:contentReference        points at jmix:droppableContent
 *        jnt:fileReference           points at jnt:file
 *        jnt:contentFolderReference  points at jnt:contentFolder
 *
 * Consequences worth knowing: a media folder (jnt:folder) accepts files and nothing else, so no
 * reference can ever be pasted into one and no content can either; and anything that is not a file,
 * a content folder or droppable content cannot be referenced at all - a page being the common case.
 */

const DESTINATION_AND_SOURCES = gql`
    query MultisiteTransferCheck($destination: String!, $sourcePaths: [String!]!) {
        jcr {
            destination: nodeByPath(path: $destination) {
                uuid
                allowedChildNodeTypes { name }
                # Whether this user may add anything here at all. Read access is enough to browse a
                # site and see its folders, so a destination can look perfectly inviting and refuse.
                canAdd: hasPermission(permissionName: "jcr:addChildNodes_default")
                site {
                    sitekey
                    languages { language activeInEdit }
                }
            }
            sources: nodesByPath(paths: $sourcePaths) {
                uuid
                path
                isFile: isNodeType(type: {types: ["jnt:file"]})
                isContentFolder: isNodeType(type: {types: ["jnt:contentFolder"]})
                isDroppable: isNodeType(type: {types: ["jmix:droppableContent"]})
                translationLanguages
            }
        }
    }
`;

// Asked second, because it needs the destination's list to ask about. isNodeType is what settles
// this: a node satisfies a constraint through its primary type, its supertypes or its mixins, and
// reproducing that walk here would only be an imitation of it.
const SOURCES_ARE_ALLOWED = gql`
    query MultisiteAllowedCheck($sourcePaths: [String!]!, $childTypes: [String]!) {
        jcr {
            sources: nodesByPath(paths: $sourcePaths) {
                path
                isAllowedChild: isNodeType(type: {multi: ANY, types: $childTypes})
            }
        }
    }
`;

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

const parentOf = path => path.substring(0, path.lastIndexOf('/'));

/**
 * The refusals that hold whatever the node types say.
 *
 * Moving something into itself or into its own subtree is incoherent either way. Landing back in
 * the folder it already sits in is only a refusal for a move, where it would do nothing; copying
 * into the same folder is a perfectly ordinary way to duplicate something.
 */
export const isStructurallyAllowed = (nodes, destination, type) => {
    if (!destination || !nodes || nodes.length === 0) {
        return false;
    }

    return nodes.every(node =>
        node.path !== destination &&
        !destination.startsWith(node.path + '/') &&
        (type !== 'cut' || parentOf(node.path) !== destination)
    );
};

/**
 * Whether this clipboard can be pasted into this folder, as itself and as references.
 *
 * @param {string} destination path of the folder being pasted into
 * @param {{type: string, nodes: Array}} clipboard what is waiting to be pasted
 * @returns {{loading: boolean, canPaste: boolean, canReference: boolean, typeByPath: object}} verdict
 */
export const useTransferCheck = (destination, clipboard) => {
    const nodes = clipboard?.nodes || [];
    const paths = nodes.map(node => node.path);
    const structurallyOk = isStructurallyAllowed(nodes, destination, clipboard?.type);
    const skip = !destination || paths.length === 0 || !structurallyOk;

    const first = useQuery(DESTINATION_AND_SOURCES, {
        variables: {destination: destination || '/', sourcePaths: paths},
        skip,
        fetchPolicy: 'cache-first'
    });

    const childTypes = (first.data?.jcr?.destination?.allowedChildNodeTypes || []).map(t => t.name);

    const second = useQuery(SOURCES_ARE_ALLOWED, {
        variables: {sourcePaths: paths, childTypes},
        skip: skip || first.loading || childTypes.length === 0,
        fetchPolicy: 'cache-first'
    });

    const empty = {
        loading: false, canPaste: false, canReference: false, typeByPath: {},
        isReadOnly: false, missingLanguages: []
    };

    if (skip) {
        return empty;
    }

    if (first.loading || second.loading) {
        return {...empty, loading: true};
    }

    const destination_ = first.data?.jcr?.destination;
    const allowed = new Set(childTypes);
    const sources = first.data?.jcr?.sources || [];

    // Read access is enough to browse, so a folder can look inviting and still refuse everything
    const isReadOnly = destination_ ? !destination_.canAdd : false;

    // Languages the destination site does not publish. Content carrying only those arrives with
    // nothing to show: a warning rather than a refusal, since the transfer itself is legitimate and
    // the translation can follow.
    const siteLanguages = new Set((destination_?.site?.languages || [])
        .filter(l => l.activeInEdit)
        .map(l => l.language));
    const sourceLanguages = new Set(sources.flatMap(source => source.translationLanguages || []));
    const missingLanguages = siteLanguages.size === 0 ?
        [] :
        [...sourceLanguages].filter(language => !siteLanguages.has(language));

    // Plain paste: every source has to be something this folder accepts
    const verdicts = second.data?.jcr?.sources || [];
    const canPaste = !isReadOnly && verdicts.length === paths.length && verdicts.every(s => s.isAllowedChild);

    // Reference paste: every source needs a reference type, and the folder has to accept it
    const typeByPath = {};
    let canReference = sources.length > 0 && !isReadOnly;
    for (const source of sources) {
        const referenceType = referenceTypeFor(source);
        if (!referenceType || !allowed.has(referenceType)) {
            canReference = false;
            break;
        }

        typeByPath[source.path] = referenceType;
    }

    return {
        loading: false,
        canPaste,
        canReference,
        typeByPath: canReference ? typeByPath : {},
        isReadOnly,
        missingLanguages
    };
};
