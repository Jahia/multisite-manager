import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {Close, Input, Search} from '@jahia/moonstone';
import {msSearch} from './MultisiteManager.redux';
import {REDUX_KEY} from './MultisiteManager.constants';
import styles from './MultisiteManager.scss';

// Long enough that typing a word does not run a query per letter
const DEBOUNCE_MS = 350;

/**
 * Finding something in a site, rather than expanding until it appears.
 *
 * Kept local while typing and pushed to the store on a pause: every keystroke would otherwise
 * re-run the query and re-render the pane under the reader's hands.
 */
export const PaneSearch = ({pane}) => {
    const {t} = useTranslation('multisite-manager');
    const dispatch = useDispatch();
    const committed = useSelector(state => state[REDUX_KEY][pane].searchTerms);
    const [typed, setTyped] = useState(committed);

    // Follows the store when something else clears it - changing site, for one
    useEffect(() => setTyped(committed), [committed]);

    useEffect(() => {
        if (typed === committed) {
            return undefined;
        }

        const timer = window.setTimeout(() => dispatch(msSearch(pane, typed)), DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [typed, committed, dispatch, pane]);

    return (
        <Input className={styles.search}
               size="small"
               icon={<Search/>}
               placeholder={t('multisite-manager:label.searchPlaceholder')}
               value={typed}
               data-sel-role={`multisite-search-${pane}`}
               iconEnd={typed ? <Close/> : undefined}
               onChange={event => setTyped(event.target.value)}
               onClear={typed ? (() => {
                   setTyped('');
                   dispatch(msSearch(pane, ''));
               }) : undefined}
        />
    );
};

PaneSearch.propTypes = {
    pane: PropTypes.string.isRequired
};

export default PaneSearch;
