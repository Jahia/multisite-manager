import {SearchQueryHandler} from '@jahia/jcontent';
import {MultisiteTreeQueryHandler} from './multisiteQueryHandler';

/**
 * One accordion item per pane - not to draw an accordion, but because useLayoutQuery resolves its
 * query configuration by looking the mode up in the registry. There is no accordion on screen any
 * more; this is the config the tree runs on.
 */
export const paneMode = pane => `multisite-${pane}-tree`;
export const paneSearchMode = pane => `multisite-${pane}-search`;

export const registerPaneAccordions = (registry, pane) => {
    // Searching answers a different question from browsing - "where is the thing I want" rather
    // than "what is here" - so it is a flat list, and a second query configuration rather than a
    // filter over the tree. jContent's own search handler does the work.
    registry.add('accordionItem', paneSearchMode(pane), {
        targets: [`multisite-${pane}:20`],
        rootPath: '/sites/{site}',
        getRootPath(site) {
            return this.rootPath.replace('{site}', site);
        },
        treeConfig: {selectableTypes: [], openableTypes: []},
        tableConfig: {
            queryHandler: SearchQueryHandler,
            defaultSort: {orderBy: 'displayName', order: 'ASC'}
        }
    });

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
