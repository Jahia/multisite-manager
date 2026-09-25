import {useQuery} from '@apollo/client';
import gql from 'graphql-tag';

/**
 * Whether this user may use the manager at all.
 *
 * jahia-ui-root honours requiredPermission on a primary-nav-item but ignores it on a route, so
 * hiding the entry hides only the entry: the URL still answers. The panes would be harmless -
 * every query runs as the user, and the site switcher only lists sites they hold the permission on
 * - but an empty screen is a poor way to say "not for you".
 *
 * The question is "on any site", not "on the current one". This tool exists to work across sites,
 * and someone who has access somewhere but not where they happen to be standing should still get in.
 */
const SITES_I_CAN_REACH = gql`
    query MultisiteAccessCheck {
        jcr {
            sites: nodesByQuery(query: "select * from [jnt:virtualsite] where isdescendantnode('/sites')") {
                nodes {
                    name
                    hasPermission(permissionName: "jContentAccess")
                }
            }
        }
    }
`;

export const useHasAccess = () => {
    const {data, loading, error} = useQuery(SITES_I_CAN_REACH, {fetchPolicy: 'cache-first'});

    if (loading) {
        return {loading: true, hasAccess: false};
    }

    if (error) {
        console.error('Could not check access to the multisite manager', error);
        // Refusing on a failed check rather than letting it through: the check is the guard
        return {loading: false, hasAccess: false, failed: true};
    }

    const reachable = (data?.jcr?.sites?.nodes || []).filter(site => site.hasPermission);
    return {loading: false, hasAccess: reachable.length > 0};
};

export default useHasAccess;
