import React from 'react';
import i18next from 'i18next';
import en from '../main/resources/javascript/locales/en.json';
import fr from '../main/resources/javascript/locales/fr.json';
import de from '../main/resources/javascript/locales/de.json';
import MultisiteManager from './MultisiteManager/MultisiteManager';
import MultisiteManagerNavItem from './MultisiteManagerNavItem';
import {MULTISITE_ROUTE, PANES} from './MultisiteManager/MultisiteManager.constants';
import {registerReducer} from './MultisiteManager/MultisiteManager.redux';
import {registerPaneAccordions} from './MultisiteManager/paneAccordions';

const registerResources = () => {
    [['en', en], ['fr', fr], ['de', de]].forEach(([lang, resource]) => {
        const bundle = resource['multisite-manager'];
        if (bundle && !i18next.hasResourceBundle(lang, 'multisite-manager')) {
            i18next.addResourceBundle(lang, 'multisite-manager', bundle, true, true);
        }
    });
};

export default async function (registry) {
    registerResources();
    await i18next.loadNamespaces('multisite-manager');

    registerReducer(registry);
    PANES.forEach(pane => registerPaneAccordions(registry, pane));

    // Its own first-level entry and route, rather than a mode inside jContent: jContent's URL
    // carries exactly one site (/jcontent/<site>/<lang>/<path>) and there is no honest place in it
    // for a second one. Owning the route sidesteps that instead of bending it.
    registry.add('primary-nav-item', 'multisite-manager', {
        targets: ['nav-root-top:2.7'],
        requiredPermission: 'jContentAccess',
        render: () => <MultisiteManagerNavItem/>
    });

    registry.add('route', 'route-multisite-manager', {
        targets: ['main:2.7'],
        path: MULTISITE_ROUTE,
        requiredPermission: 'jContentAccess',
        render: () => <MultisiteManager/>
    });
}
