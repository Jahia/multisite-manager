import React from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {Button, Copy, Cut, Paste, PasteAsReference, Reload, Typography} from '@jahia/moonstone';
import {msClearClipboard, msFailure, msReload, msSetClipboard, msSetSelection} from './MultisiteManager.redux';
import {OTHER_PANE, REDUX_KEY} from './MultisiteManager.constants';
import {useTransfer} from './useTransfer';
import UndoButton from './UndoButton';
import {useTransferCheck} from './transferRules';
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
    const hasClipboard = clipboard.nodes.length > 0;

    // Asked of the repository rather than assumed: whether this folder accepts these things, and
    // whether it accepts references to them. Both buttons were previously offered whenever there
    // was anything on the clipboard, so a paste the destination could never accept looked available
    // and then failed.
    const {loading: isChecking, canPaste: typesAllowPaste, canReference, typeByPath,
        isReadOnly, missingLanguages} = useTransferCheck(path, clipboard);

    const canPaste = hasClipboard && Boolean(path) && !isPasting && !isChecking && typesAllowPaste;

    // Referencing something you are in the middle of moving makes no sense, and jContent hides it
    // for the same reason
    const canPasteReference = hasClipboard && Boolean(path) && !isPasting && !isChecking &&
        clipboard.type !== 'cut' && canReference;

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

    const onPasteAsReference = async () => {
        await transfer({
            clipboard,
            toPane: pane,
            destination: path,
            asReferenceTypes: typeByPath
        });
        // The clipboard survives on purpose: referencing the same thing from several places is the
        // ordinary use, not the exception
    };

    // Worked out here rather than inline: the toolbar has four things it might need to say, and
    // choosing between them in the markup made the component hard to read
    let status = '';
    if (hasSelection) {
        status = t('multisite-manager:label.selected', {count: selection.length});
    } else if (hasClipboard && !path) {
        status = t('multisite-manager:label.chooseDestination', {count: clipboard.nodes.length});
    } else if (hasClipboard && !isChecking && isReadOnly) {
        status = t('multisite-manager:label.readOnly');
    } else if (hasClipboard && !isChecking && !typesAllowPaste) {
        status = t('multisite-manager:label.pasteRefused');
    } else if (hasClipboard && !isChecking && missingLanguages.length > 0) {
        // A caution, not a refusal: the transfer is legitimate and the translation can follow
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

    // Re-reading is also the way out of a wrong-looking pane: the automatic refresh depends on a
    // transfer having reported what it did, and anything that goes astray there leaves the tree
    // showing the state before it.
    const onRefresh = () => {
        dispatch(msFailure(pane, null));
        dispatch(msReload(pane));
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
            <Button size="default"
                    variant="ghost"
                    icon={<PasteAsReference/>}
                    label={t('multisite-manager:label.pasteReference')}
                    disabled={!canPasteReference}
                    title={t('multisite-manager:label.pasteReferenceHint')}
                    data-sel-role="multisite-paste-reference"
                    onClick={onPasteAsReference}
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
