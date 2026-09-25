import {MultisiteTreeQueryHandler} from './multisiteQueryHandler';

/**
 * One accordion item per pane - not to draw an accordion, but because useLayoutQuery resolves its
 * query configuration by looking the mode up in the registry. There is no accordion on screen any
 * more; this is the config the tree runs on.
 */
export const paneMode = pane => `multisite-${pane}-tree`;

export const registerPaneAccordions = (registry, pane) => {
    registry.add('accordionItem', paneMode(pane), {
        targets: [`multisite-${pane}:10`],
        rootPath: '/sites/{site}',
        getRootPath(site) {
            return this.rootPath.replace('{site}', site);
        },
        treeConfig: {
            selectableTypes: [],
            openableTypes: []
        },
        tableConfig: {
            queryHandler: MultisiteTreeQueryHandler,
            // The site node itself is shown, so there is always something to drop onto when the
            // destination is the top of the site
            hideRoot: false,
            defaultSort: {orderBy: 'displayName', order: 'ASC'}
        }
    });
};
