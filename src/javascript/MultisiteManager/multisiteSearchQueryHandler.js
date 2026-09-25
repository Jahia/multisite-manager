import gql from 'graphql-tag';
import {BaseQueryHandler, QueryHandlersFragments} from '@jahia/jcontent';

/**
 * Searching one site by name and title.
 *
 * jContent's search handler asks three questions at once: a full-text `contains` over the whole
 * node, another over j:tagList, and a name match. The full-text clause reaches into page bodies and
 * extracted file content, which is right for "find me everything about mortgages" and wrong here -
 * this screen is used to locate a known item in order to move it, and the answer wanted is the one
 * whose name you already half remember.
 *
 * Measured on this instance, searching luxe for "home" with the fragments the module attaches:
 *
 *     jContent's constraint   1.65s cold, 0.17-0.41s warm, 31.7KB, 94 results
 *     name and title only     0.09s cold, 0.06s warm,       2.1KB,  4 results
 *
 * Most of that is the second-order cost: the full-text clause matched 94 nodes, and every one of
 * them then paid for publication info, ancestors and operations support. Asking a narrower question
 * is both faster and a better answer.
 *
 * The site scope was already right - nodesByCriteria takes the site root in `paths` - so that part
 * is unchanged.
 */
const SearchByNameQuery = gql`
    query MultisiteSearchQuery($searchPath: String!, $nodeType: String!, $pattern: String!, $language: String!, $displayLanguage: String!, $offset: Int, $limit: Int, $fieldSorter: InputFieldSorterInput, $doSearch: Boolean!) {
        jcr {
            nodesByCriteria(
                criteria: {
                    language: $language,
                    nodeType: $nodeType,
                    paths: [$searchPath],
                    nodeConstraint: {
                        any: [
                            # LOWER_CASE lowercases the column server-side, so the pattern has to be
                            # lowercased too - the same trick jContent uses for file names
                            {like: $pattern, property: "j:nodename", function: LOWER_CASE}
                            {like: $pattern, property: "jcr:title", function: LOWER_CASE}
                        ]
                    }
                },
                offset: $offset,
                limit: $limit,
                fieldSorter: $fieldSorter
            ) @include(if: $doSearch) {
                pageInfo {
                    totalCount
                }
                nodes {
                    ...NodeFields
                    ... node
                }
            }
        }
    }
    ${QueryHandlersFragments.nodeFields.gql}
`;

export const MultisiteSearchQueryHandler = {
    ...BaseQueryHandler,

    getQuery: () => SearchByNameQuery,

    getQueryVariables: ({uilang, lang, searchPath, searchContentType, searchTerms, pagination, sort}) => ({
        searchPath,
        // The jmix:searchable type covers pages, content and files, and is measurably quicker than
        // nt:base. It does miss plain folders, which are rarely searched for by name.
        nodeType: searchContentType || 'jmix:searchable',
        pattern: `%${(searchTerms || '').toLowerCase()}%`,
        language: lang,
        displayLanguage: uilang,
        offset: pagination.currentPage * pagination.pageSize,
        limit: pagination.pageSize,
        fieldSorter: sort.orderBy === '' ? null : {
            sortType: sort.order === '' ? null : (sort.order === 'DESC' ? 'DESC' : 'ASC'),
            fieldName: sort.orderBy,
            ignoreCase: true
        },
        doSearch: Boolean(searchTerms)
    }),

    getResults: (data, {searchTerms}) => (searchTerms ?
        data?.jcr?.nodesByCriteria :
        {nodes: [], pageInfo: {totalCount: 0}}),

    getFragments: () => []
};

export default MultisiteSearchQueryHandler;
