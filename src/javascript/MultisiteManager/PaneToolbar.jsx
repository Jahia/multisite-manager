import React from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {Button, Copy, Cut, Paste, Typography} from '@jahia/moonstone';
import {msClearClipboard, msSetClipboard, msSetSelection} from './MultisiteManager.redux';
import {OTHER_PANE, REDUX_KEY} from './MultisiteManager.constants';
import {useTransfer} from './useTransfer';
import styles from './MultisiteManager.scss';

/**
 * Copy, cut and paste for one pane.
 *
 * Paste always targets the folder this pane is showing, so the direction of a transfer is decided
 * by which side you press Paste on. That keeps the destination visible at the moment of the
 * decision, which a single shared toolbar could not do.
 */
export const PaneToolbar = ({pane}) => {
    const {t} = useTranslation('multisite-manager');
    const dispatch = useDispatch();
    const {transfer, isPasting} = useTransfer();

    const {selection, path, clipboard} = useSelector(state => ({
        selection: state[REDUX_KEY][pane].selection,
        path: state[REDUX_KEY][pane].path,
        clipboard: state[REDUX_KEY].clipboard
    }));

    const hasSelection = selection.length > 0;
    const canPaste = clipboard.nodes.length > 0 && Boolean(path) && !isPasting;

    const onCopyCut = type => {
        dispatch(msSetClipboard(type, selection));
        dispatch(msSetSelection(pane, []));
    };

    const onPaste = async () => {
        const {failures} = await transfer({
            clipboard,
            toPane: pane,
            fromPane: OTHER_PANE[pane],
            destination: path
        });

        // A cut is spent once pasted; a copy stays, so the same item can be put in several places
        // without copying it again.
        if (clipboard.type === 'cut' && failures.length === 0) {
            dispatch(msClearClipboard());
        }
    };

    return (
        <div className={styles.paneToolbar} data-sel-role={`multisite-toolbar-${pane}`}>
            <Button size="default"
                    variant="ghost"
                    icon={<Copy/>}
                    label={t('multisite-manager:label.copy')}
                    disabled={!hasSelection}
                    data-sel-role="multisite-copy"
                    onClick={() => onCopyCut('copy')}
            />
            <Button size="default"
                    variant="ghost"
                    icon={<Cut/>}
                    label={t('multisite-manager:label.cut')}
                    disabled={!hasSelection}
                    data-sel-role="multisite-cut"
                    onClick={() => onCopyCut('cut')}
            />
            <Button size="default"
                    variant="ghost"
                    icon={<Paste/>}
                    label={t('multisite-manager:label.paste')}
                    disabled={!canPaste}
                    data-sel-role="multisite-paste"
                    onClick={onPaste}
            />
            <div className={styles.toolbarStatus}>
                <Typography variant="caption">
                    {hasSelection && t('multisite-manager:label.selected', {count: selection.length})}
                    {!hasSelection && clipboard.nodes.length > 0 && (path ?
                        t('multisite-manager:label.pasteInto', {
                            count: clipboard.nodes.length,
                            folder: path.substring(path.lastIndexOf('/') + 1)
                        }) :
                        t('multisite-manager:label.chooseDestination', {count: clipboard.nodes.length}))}
                </Typography>
            </div>
        </div>
    );
};

PaneToolbar.propTypes = {
    pane: PropTypes.string.isRequired
};

export default PaneToolbar;
