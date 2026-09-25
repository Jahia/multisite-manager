/**
 * JContent reaches this module as a module-federation remote, resolved by the app shell at runtime.
 * Under jest there is no app shell, so the imports have to come from somewhere - and the specs here
 * test this module's own logic, never jContent's.
 */
module.exports = {
    BaseQueryHandler: {},
    BaseTreeQueryHandler: {getTreeParams: () => ({}), getQueryVariables: () => ({})},
    BaseDescendantsQuery: {},
    QueryHandlersFragments: {nodeFields: {gql: {}}},
    SiteSwitcher: () => null,
    ContentStatuses: () => null,
    NodeIcon: () => null,
    useLayoutQuery: () => ({result: null, loading: false, error: null, refetch: () => {}})
};
