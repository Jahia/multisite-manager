import React from 'react';
import PropTypes from 'prop-types';
import {useDispatch} from 'react-redux';
import {msFailure, msReload, msRenamed} from './MultisiteManager.redux';
import {usePaneClipboard} from './usePaneClipboard';
import {useTranslation} from 'react-i18next';
import {Button, Copy, Cut, Paste, PasteAsReference, Reload, Typography} from '@jahia/moonstone';
import UndoButton from './UndoButton';
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
    const {
        selection, path, clipboard, hasSelection, hasClipboard, isChecking, isPasting,
        isReadOnly, missingLanguages, canPaste, canPasteReference, copy, cut, paste, pasteAsReference
    } = usePaneClipboard(pane);

    // Re-reading is also the way out of a wrong-looking pane: the automatic refresh depends on a
    // transfer having reported what it did, and anything that goes astray there leaves the tree
    // showing the state before it.
    const onRefresh = () => {
        dispatch(msFailure(pane, null));
        dispatch(msRenamed(pane, []));
        dispatch(msReload(pane));
    };

    // Worked out here rather than inline: the toolbar has several things it might need to say, and
    // choosing between them in the markup made the component hard to read
    let status = '';
    if (hasSelection) {
        status = t('multisite-manager:label.selected', {count: selection.length});
    } else if (hasClipboard && !path) {
        status = t('multisite-manager:label.chooseDestination', {count: clipboard.nodes.length});
    } else if (hasClipboard && !isChecking && isReadOnly) {
        status = t('multisite-manager:label.readOnly');
    } else if (hasClipboard && !isChecking && !canPaste && !isPasting) {
        status = t('multisite-manager:label.pasteRefused');
    } else if (hasClipboard && !isChecking && missingLanguages.length > 0) {
        status = t('multisite-manager:label.missingLanguages', {
            languages: missingLanguages.join(', '),
            count: missingLanguages.length
        });
    } else if (hasClipboard) {
        status = t('multisite-manager:label.pasteInto', {
            count: clipboard.nodes.length,
            folder: path.substring(path.lastIndexOf('/') + 1)
        });
    }

    return (
        <div className={styles.paneToolbar} data-sel-role={`multisite-toolbar-${pane}`}>
            <Button size="default"
                    variant="ghost"
                    icon={<Copy/>}
                    label={t('multisite-manager:label.copy')}
                    disabled={!hasSelection}
                    data-sel-role="multisite-copy"
                    onClick={copy}
            />
            <Button size="default"
                    variant="ghost"
                    icon={<Cut/>}
                    label={t('multisite-manager:label.cut')}
                    disabled={!hasSelection}
                    data-sel-role="multisite-cut"
                    onClick={cut}
            />
            <Button size="default"
                    variant="ghost"
                    icon={<Paste/>}
                    label={t('multisite-manager:label.paste')}
                    disabled={!canPaste}
                    data-sel-role="multisite-paste"
                    onClick={paste}
            />
            <Button size="default"
                    variant="ghost"
                    icon={<PasteAsReference/>}
                    label={t('multisite-manager:label.pasteReference')}
                    disabled={!canPasteReference}
                    title={t('multisite-manager:label.pasteReferenceHint')}
                    data-sel-role="multisite-paste-reference"
                    onClick={pasteAsReference}
            />
            <UndoButton pane={pane} isBusy={isPasting}/>
            <Button size="default"
                    variant="ghost"
                    icon={<Reload/>}
                    title={t('multisite-manager:label.refresh')}
                    data-sel-role="multisite-refresh"
                    onClick={onRefresh}
            />
            <div className={styles.toolbarStatus}>
                <Typography variant="caption">{status}</Typography>
            </div>
        </div>
    );
};

PaneToolbar.propTypes = {
    pane: PropTypes.string.isRequired
};

export default PaneToolbar;
