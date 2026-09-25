import React from 'react';
import {AccordionItem, Collections, File, Page} from '@jahia/moonstone';
import {
    ContentFoldersQueryHandler,
    ContentTree,
    FilesQueryHandler,
    PagesQueryHandler
} from '@jahia/jcontent';
import {msClosePaths, msOpenPaths, msSetPath, paneSelector} from './MultisiteManager.redux';
import {paneTarget} from './MultisiteManager.constants';

/**
 * The piece that lets one browser be mounted twice.
 *
 * jContent's own accordion items render `<ContentTree item={item}/>` with no state wiring, so those
 * trees bind to jContent's store. ContentTree does accept a selector and path actions as props
 * though, and the content picker already exploits this to run a second browser off its own slice.
 * The same trick, once per pane: identical definitions, different state underneath.
 */
const paneRenderer = pane => ({
    render: (v, item) => (
        <AccordionItem key={v.id} {...v}>
            <ContentTree item={item}
                         isReversed={false}
                         refetcherType={`multisite-${pane}-refetcher`}
                         selector={paneSelector(pane)}
                         setPathAction={path => msSetPath(pane, path)}
                         openPathAction={path => msOpenPaths(pane, [path])}
                         closePathAction={path => msClosePaths(pane, [path])}
            />
        </AccordionItem>
    ),
    getRootPath(site) {
        return this.rootPath.replace('{site}', site);
    },
    getPath(site, pathElements) {
        const path = '/sites/' + site + '/' + pathElements.join('/');
        return path.startsWith(this.getRootPath(site)) ? path : this.getRootPath(site);
    }
});

// Not exported by jContent, and a remote import would not resolve anyway - it is two fields
const SORT_TREE_BY_NAME_ASC = {fieldName: 'displayName', sortType: 'ASC'};

// Only the three that answer "what content does this site have" - the manager exists to move pages,
// content and media between sites, so search, categories and the app accordions are left out.
//
// treeConfig is what ContentTree reads (openable/selectable types, sorting, drag and drop);
// tableConfig is what the content list will read once there is one. Both are required: ContentTree
// dereferences item.treeConfig without guarding it.
const sections = [
    {
        key: 'pages',
        icon: <Page/>,
        label: 'multisite-manager:label.pages',
        rootPath: '/sites/{site}',
        // The systemsite has no pages, and an empty accordion only invites a dead end
        isEnabled: siteKey => siteKey !== 'systemsite',
        treeConfig: {
            hideRoot: true,
            rootLabel: 'jcontent:label.contentManager.browsePages',
            selectableTypes: ['jnt:page', 'jnt:virtualsite', 'jnt:externalLink', 'jnt:nodeLink', 'jnt:navMenuText', 'jmix:visibleInPagesTree'],
            openableTypes: ['jnt:page', 'jnt:virtualsite', 'jnt:navMenuText', 'jmix:visibleInPagesTree']
        },
        tableConfig: {queryHandler: PagesQueryHandler, typeFilter: ['jnt:page']}
    },
    {
        key: 'content-folders',
        icon: <File/>,
        label: 'multisite-manager:label.content',
        rootPath: '/sites/{site}/contents',
        treeConfig: {
            rootLabel: 'jcontent:label.contentManager.browseFolders',
            sortBy: SORT_TREE_BY_NAME_ASC,
            selectableTypes: ['jmix:cmContentTreeDisplayable', 'jmix:visibleInContentTree', 'jnt:contentFolder'],
            openableTypes: ['jmix:cmContentTreeDisplayable', 'jmix:visibleInContentTree', 'jnt:contentFolder']
        },
        tableConfig: {queryHandler: ContentFoldersQueryHandler, typeFilter: ['jnt:content']}
    },
    {
        key: 'media',
        icon: <Collections/>,
        label: 'multisite-manager:label.media',
        rootPath: '/sites/{site}/files',
        treeConfig: {
            rootLabel: 'jcontent:label.contentManager.browseFiles',
            sortBy: SORT_TREE_BY_NAME_ASC,
            selectableTypes: ['jnt:folder'],
            openableTypes: ['jnt:folder']
        },
        tableConfig: {queryHandler: FilesQueryHandler, typeFilter: ['jnt:file', 'jnt:folder']}
    }
];

export const registerPaneAccordions = (registry, pane) => {
    sections.forEach((section, index) => {
        const {key, ...definition} = section;
        registry.add('accordionItem', `multisite-${pane}-${key}`, {
            ...definition,
            targets: [`${paneTarget(pane)}:${(index + 1) * 10}`]
        }, paneRenderer(pane));
    });
};
