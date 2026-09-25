import React from 'react';
import PropTypes from 'prop-types';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {Button, Undo} from '@jahia/moonstone';
import {REDUX_KEY} from './MultisiteManager.constants';
import {useUndo} from './useUndo';

/**
 * Taking back the last transfer, offered in the pane it landed in.
 *
 * There rather than in a single shared place, because that is where its result is on screen: the
 * rows that appeared are the thing being taken back, and a control on the far side of the window
 * would be describing something the reader is not looking at.
 *
 * It renders nothing when there is nothing to undo, so the toolbar does not carry a permanently
 * dead button.
 */
export const UndoButton = ({pane, isBusy}) => {
    const {t} = useTranslation('multisite-manager');
    const snapshot = useSelector(state => state[REDUX_KEY].undo);
    const {undo, isUndoing} = useUndo();

    if (!snapshot || snapshot.pane !== pane) {
        return null;
    }

    // The label says only "Undo"; what it would take back belongs in the tooltip, where there is
    // room to name it and where it does not stretch the toolbar
    const title = t(snapshot.kind === 'move' ?
        'multisite-manager:label.undoMove' :
        'multisite-manager:label.undoCreate', {
        count: snapshot.entries.length,
        name: snapshot.entries[0]?.name
    });

    return (
        <Button size="default"
                variant="ghost"
                color="accent"
                icon={<Undo/>}
                label={t('multisite-manager:label.undo')}
                title={title}
                disabled={isUndoing || isBusy}
                data-sel-role="multisite-undo"
                onClick={() => undo(snapshot)}
        />
    );
};

UndoButton.propTypes = {
    pane: PropTypes.string.isRequired,
    isBusy: PropTypes.bool
};

export default UndoButton;
