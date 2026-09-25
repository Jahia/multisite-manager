import React from 'react';
import {useTranslation} from 'react-i18next';
import {useHistory} from 'react-router';
import {PrimaryNavItem, Simulate} from '@jahia/moonstone';
import {MULTISITE_ROUTE} from './MultisiteManager/MultisiteManager.constants';

export const MultisiteManagerNavItem = () => {
    const {t} = useTranslation('multisite-manager');
    const history = useHistory();

    return (
        <PrimaryNavItem key="multisite-manager"
                        role="multisite-manager"
                        isSelected={history.location.pathname.startsWith(MULTISITE_ROUTE)}
                        label={t('multisite-manager:label.title')}
                        icon={<Simulate/>}
                        onClick={() => history.push(MULTISITE_ROUTE)}
        />
    );
};

export default MultisiteManagerNavItem;
