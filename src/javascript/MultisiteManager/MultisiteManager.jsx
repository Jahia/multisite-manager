import React from 'react';
import {useTranslation} from 'react-i18next';
import {LayoutModule} from '@jahia/moonstone';
import Pane from './Pane';
import {PANES} from './MultisiteManager.constants';
import styles from './MultisiteManager.scss';

/**
 * Two sites side by side.
 *
 * Jahia 7.3 showed one flat tree of everything a user could reach. Two panes are used here instead
 * because the job people describe is a transfer - taking something from one site to another - and a
 * single tree leaves the destination implicit. With two, both ends of the move are on screen and
 * neither is privileged: either side can be copied from and pasted into.
 */
export const MultisiteManager = () => {
    const {t} = useTranslation('multisite-manager');

    return (
        <LayoutModule
            title={t('multisite-manager:label.title')}
            content={
                <div className={styles.layout} data-sel-role="multisite-manager">
                    {PANES.map(pane => <Pane key={pane} pane={pane}/>)}
                </div>
            }
        />
    );
};

export default MultisiteManager;
