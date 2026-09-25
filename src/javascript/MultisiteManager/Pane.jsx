import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {SiteSwitcher} from '@jahia/jcontent';
import {msSetMode, msSetSite} from './MultisiteManager.redux';
import {REDUX_KEY} from './MultisiteManager.constants';
import {paneMode} from './paneAccordions';
import PaneContent from './PaneContent';
import PaneToolbar from './PaneToolbar';
import PaneSearch from './PaneSearch';
import {readRememberedSites, rememberSite} from './rememberedSites';
import styles from './MultisiteManager.scss';

/**
 * One side of the manager: a site, and everything on it in a single tree.
 *
 * There is no accordion here any more. jContent separates pages, content folders and media because
 * it is asking where you are working; this screen is asking what is on the site and what you want
 * to take from it, and for that the separation gets in the way - the thing being moved and its
 * destination are often on different sides of it.
 */
export const Pane = ({pane}) => {
    const dispatch = useDispatch();
    const site = useSelector(state => state[REDUX_KEY][pane].site);
    const mode = useSelector(state => state[REDUX_KEY][pane].mode);
    const currentSite = useSelector(state => state.site);

    // Opens on the pair last used, falling back to the site the reader came from. Working between
    // the same two sites for a while is the normal way this screen gets used, and starting on "the
    // current site, twice" every time makes them redo a choice they already made.
    useEffect(() => {
        if (!site) {
            const remembered = readRememberedSites()[pane];
            if (remembered || currentSite) {
                dispatch(msSetSite(pane, remembered || currentSite));
            }
        }
    }, [dispatch, pane, site, currentSite]);

    // Written when it changes rather than when the pane closes: there is no close, and a tab that
    // is simply abandoned should still be remembered.
    useEffect(() => rememberSite(pane, site), [pane, site]);

    // With no accordion to click there is nothing to choose, so the pane names its own mode once
    useEffect(() => {
        if (mode !== paneMode(pane)) {
            dispatch(msSetMode(pane, paneMode(pane)));
        }
    }, [dispatch, pane, mode]);

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
            <div className={styles.paneHeader}>
                <SiteSwitcher selector={switcherSelector}
                              onSelectAction={siteNode => msSetSite(pane, siteNode.name)}/>
                <PaneSearch pane={pane}/>
            </div>
            <PaneToolbar pane={pane}/>
            <PaneContent pane={pane}/>
        </section>
    );
};

Pane.propTypes = {
    pane: PropTypes.string.isRequired
};

export default Pane;
