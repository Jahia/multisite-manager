import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {ContentNavigation, SiteSwitcher} from '@jahia/jcontent';
import {registry} from '@jahia/ui-extender';
import {msSetMode, msSetPath, msSetSite, paneSelector} from './MultisiteManager.redux';
import {paneTarget, REDUX_KEY} from './MultisiteManager.constants';
import styles from './MultisiteManager.scss';

/**
 * One side of the manager: a site to look at, and that site's content beneath it.
 *
 * The switcher is jContent's own, which already lists every site filtered by jContentAccess - the
 * permission that decides what a reader may see. Pointing it at this pane's state rather than the
 * application's is the only change needed to make it a per-pane control.
 */
export const Pane = ({pane}) => {
    const dispatch = useDispatch();
    const site = useSelector(state => state[REDUX_KEY][pane].site);
    const currentSite = useSelector(state => state.site);

    // Both panes open on the site the editor came from, which makes the first move - pick a
    // different site on one side - obvious, and costs nothing if that is already what they wanted.
    useEffect(() => {
        if (!site && currentSite) {
            dispatch(msSetSite(pane, currentSite));
        }
    }, [dispatch, pane, site, currentSite]);

    if (!site) {
        return null;
    }

    const switcherSelector = state => ({
        siteKey: state[REDUX_KEY][pane].site,
        currentLang: state.language,
        mode: state[REDUX_KEY][pane].mode,
        path: state[REDUX_KEY][pane].path
    });

    return (
        <section className={styles.pane} data-sel-role={`multisite-pane-${pane}`}>
            <ContentNavigation
                isReversed={false}
                accordionItemTarget={paneTarget(pane)}
                selector={paneSelector(pane)}
                header={
                    <div className={styles.paneHeader}>
                        <SiteSwitcher selector={switcherSelector}
                                      onSelectAction={siteNode => msSetSite(pane, siteNode.name)}/>
                    </div>
                }
                handleNavigationAction={(nextMode, path) => {
                    // Two dispatches rather than a batch: the manager has no other writer racing
                    // it, and keeping them separate keeps the actions readable in the devtools.
                    dispatch(msSetMode(pane, nextMode));
                    return msSetPath(pane, path);
                }}
            />
        </section>
    );
};

Pane.propTypes = {
    pane: PropTypes.string.isRequired
};

export const hasAccordionsFor = pane => registry.find({type: 'accordionItem', target: paneTarget(pane)}).length > 0;

export default Pane;
