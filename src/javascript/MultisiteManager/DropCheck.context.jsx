import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {useApolloClient} from '@apollo/client';
import gql from 'graphql-tag';

/**
 * Telling the reader, while they are still holding something, whether it can be dropped.
 *
 * The obvious way to do this is to ask the server as the pointer crosses each row, which is a query
 * per row and was why the drag went without a check at all. It is avoidable: what is being dragged
 * does not change during a drag, so only the destinations vary, and those can all be asked about at
 * once the moment the drag begins. After that the answer is in hand and canDrop is synchronous.
 *
 * Each tree registers the folders it is currently showing; the union of them is what gets asked
 * about. A drag therefore costs one query, whatever the pointer then does.
 */
const CANDIDATES = gql`
    query MultisiteDropCandidates($paths: [String!]!) {
        jcr {
            nodesByPath(paths: $paths) {
                path
                allowedChildNodeTypes { name }
            }
        }
    }
`;

const SOURCES = gql`
    query MultisiteDragSources($paths: [String!]!) {
        jcr {
            nodesByPath(paths: $paths) {
                path
                primaryNodeType { name }
            }
        }
    }
`;

const DropCheckContext = createContext(null);

export const DropCheckProvider = ({children}) => {
    const client = useApolloClient();
    // Which folders each pane is showing. A ref, because registering them must not re-render.
    const candidates = useRef({});
    const [accepted, setAccepted] = useState(null);

    const register = useCallback((pane, paths) => {
        candidates.current[pane] = paths;
    }, []);

    /** Called when a drag starts: ask, once, which of the visible folders would take these nodes. */
    const prime = useCallback(async nodes => {
        const destinations = [...new Set(Object.values(candidates.current).flat())];
        if (destinations.length === 0 || nodes.length === 0) {
            return;
        }

        try {
            const [dests, sources] = await Promise.all([
                client.query({query: CANDIDATES, variables: {paths: destinations}, fetchPolicy: 'cache-first'}),
                client.query({query: SOURCES, variables: {paths: nodes.map(n => n.path)}, fetchPolicy: 'cache-first'})
            ]);

            const sourceTypes = (sources.data?.jcr?.nodesByPath || []).map(n => n.primaryNodeType?.name);
            const byPath = {};
            for (const dest of dests.data?.jcr?.nodesByPath || []) {
                const allows = new Set((dest.allowedChildNodeTypes || []).map(t => t.name));
                // Every dragged node has to be something this folder takes. Matching on the primary
                // type only: a node can also satisfy a constraint through a supertype or a mixin, so
                // this errs towards refusing, and the server stays the authority either way.
                byPath[dest.path] = sourceTypes.every(type => allows.has(type));
            }

            setAccepted(byPath);
        } catch (e) {
            // A failed check should not forbid the drop - fall back to letting the server answer
            console.warn('Could not check where this can be dropped', e);
            setAccepted(null);
        }
    }, [client]);

    const clear = useCallback(() => setAccepted(null), []);

    /** Undecided until primed, and undecided is permissive: the server still has the last word. */
    const accepts = useCallback(path => (accepted === null ? true : Boolean(accepted[path])), [accepted]);

    const context = useMemo(() => ({register, prime, clear, accepts}), [register, prime, clear, accepts]);

    return <DropCheckContext.Provider value={context}>{children}</DropCheckContext.Provider>;
};

DropCheckProvider.propTypes = {children: PropTypes.node};

export const useDropCheck = () => useContext(DropCheckContext) || {
    register: () => {},
    prime: () => {},
    clear: () => {},
    accepts: () => true
};

export default DropCheckProvider;
