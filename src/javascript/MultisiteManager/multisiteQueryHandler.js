import gql from 'graphql-tag';
import {BaseDescendantsQuery, BaseQueryHandler, BaseTreeQueryHandler} from '@jahia/jcontent';

/**
 * One tree per site, with pages, content folders and media in it together.
 *
 * jContent splits these into three accordions because it is answering "where am I working today".
 * This screen is answering "what is on this site, and what do I want to take from it", and for that
 * the split is an obstacle: the thing you want to move and the place you want to put it are often
 * in different halves.
 *
 * Built on jContent's own tree handler, so the branch-by-branch loading is the same: only opened
 * paths are fetched, which is what makes a large site cheap to open.
 */

// Everything an editor would recognise as somewhere content lives, plus the content itself.
// jnt:virtualsite is the site node, which is the root of the tree.
const TYPE_FILTER = [
    'jnt:virtualsite',
    'jnt:page',
    'jnt:contentFolder',
    'jnt:folder',
    'jnt:file',
    'jnt:contentList',
    'jmix:editorialContent',
    'jmix:visibleInContentTree'
];

const SORT_BY_NAME_ASC = {fieldName: 'displayName', sortType: 'ASC'};

/**
 * What a reference points at, carried on every row.
 *
 * A reference node shows the name it was given, which says nothing about where the thing it refers
 * to actually lives - and in a tool whose whole subject is content coming from elsewhere, that is
 * the one fact worth having. j:node is the weak reference every reference type carries, and refNode
 * follows it.
 *
 * Fetched with the tree rather than looked up per row: it is two extra fields on a query that is
 * already being made, and rows with no such property simply come back null.
 */
export const ReferenceFields = {
    gql: gql`
        fragment MultisiteReferenceFields on JCRNode {
            referenced: property(name: "j:node") {
                refNode {
                    path
                    displayName(language: $language)
                    site {
                        sitekey
                        displayName(language: $displayLanguage)
                    }
                }
            }
        }
    `,
    applyFor: 'node'
};

export const MultisiteTreeQueryHandler = {
    ...BaseQueryHandler,
    ...BaseTreeQueryHandler,

    getQuery: () => BaseDescendantsQuery,

    getTreeParams: options => ({
        ...BaseTreeQueryHandler.getTreeParams(options),
        // Content keeps its authored order in jContent; here the tree is for finding things, and
        // alphabetical is how you find them
        sortBy: SORT_BY_NAME_ASC
    }),

    getQueryVariables: options => ({
        ...BaseTreeQueryHandler.getQueryVariables(options),
        typeFilter: TYPE_FILTER
    }),

    isStructured: () => true
};

export default MultisiteTreeQueryHandler;
