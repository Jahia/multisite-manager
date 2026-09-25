import React, {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {useDrop} from 'react-dnd';
import clsx from 'clsx';
import {Banner, Checkbox, Loader, Table, TableBody, TableHead, TableHeadCell, TableRow, Typography} from '@jahia/moonstone';
import {useLayoutQuery} from '@jahia/jcontent';
import {msClosePaths, msHighlight, msOpenPaths, msSetPath, msSetSelection} from './MultisiteManager.redux';
import {ReferenceFields} from './multisiteQueryHandler';
import {useTransfer} from './useTransfer';
import {REDUX_KEY} from './MultisiteManager.constants';
import {canDropInto, DRAG_TYPE, toDraggable} from './dragAndDrop';
import {flattenTree} from './treeRows';
import {isFolder} from './dragAndDrop';
import {useDropCheck} from './DropCheck.context';
import {paneSearchMode} from './paneAccordions';
import {useKeyboard} from './useKeyboard';
import {usePaneClipboard} from './usePaneClipboard';
import ContentRow from './ContentRow';
import styles from './MultisiteManager.scss';

// JContent's own value, which its query handlers compare against - not exported, so repeated
const VIEW_MODE_STRUCTURED = 'structuredView';
const VIEW_TYPE_CONTENT = 'content';

// Long enough to find the row after the eye has moved back to the panel, short enough that it is
// gone before it becomes part of how the row looks
const HIGHLIGHT_MS = 5000;

const Placeholder = ({children}) => (
    <div className={styles.contentPlaceholder}>
        <Typography variant="body">{children}</Typography>
    </div>
);

Placeholder.propTypes = {children: PropTypes.node};

/**
 * The tree for one pane: the whole site in one list, indented.
 *
 * Structured mode means the query only descends into branches that are open, so opening a site
 * with a great many pages costs nothing until those branches are asked for.
 */
const Tree = ({pane, site, mode, reloadCount, searchTerms}) => {
    const {t} = useTranslation('multisite-manager');
    const dispatch = useDispatch();
    const {language, uilang} = useSelector(state => ({language: state.language, uilang: state.uilang}));
    const {selection, openPaths, highlighted, path, failure, focusIndex} = useSelector(state => state[REDUX_KEY][pane]);
    const {copy, cut, paste} = usePaneClipboard(pane);

    const rootPath = `/sites/${site}`;
    const {transfer} = useTransfer();
    const {register, accepts} = useDropCheck();
    // Survives a re-query, which is what lets the tree stay on screen while a branch opens
    const lastRows = useRef([]);

    // A drag is always a move: the gesture says "put it there", not "leave a copy behind"
    const onDropInto = async (item, destination) => {
        if (!canDropInto(item.nodes, destination)) {
            return;
        }

        await transfer({
            clipboard: {type: 'cut', nodes: item.nodes},
            toPane: pane,
            fromPane: item.fromPane,
            destination
        });
    };

    const isSearching = Boolean(searchTerms);

    const {result, loading, error, refetch} = useLayoutQuery({
        mode,
        siteKey: site,
        path: rootPath,
        lang: language,
        uilang,
        pagination: {currentPage: 0, pageSize: 200},
        sort: {orderBy: 'displayName', order: 'ASC'},
        openPaths: openPaths.length > 0 ? openPaths : [rootPath],
        hideRoot: false,
        tableView: {viewMode: VIEW_MODE_STRUCTURED, viewType: VIEW_TYPE_CONTENT},
        // Searching looks across the whole site: the point is to find something without knowing
        // where it is, so scoping it to the open folder would defeat it
        searchPath: rootPath,
        searchContentType: 'jmix:searchable',
        searchTerms: searchTerms || ''
    }, [ReferenceFields]);

    // Remounting the tree is not enough to see a transfer: useLayoutQuery passes no fetchPolicy to
    // the tree query, so Apollo answers cache-first and hands back the state before the move. Only
    // refetch actually goes to the server, which is why this reacts to the counter rather than
    // being keyed on it.
    const lastReload = useRef(reloadCount);
    useEffect(() => {
        if (lastReload.current !== reloadCount) {
            lastReload.current = reloadCount;
            refetch();
        }
    }, [reloadCount, refetch]);

    // Dropping on empty space below the tree puts things at the top of the site, so there is
    // always a target even when every visible row is a leaf
    const [{isOverPane, canDropOnPane}, dropOnPane] = useDrop({
        accept: DRAG_TYPE,
        // Only when a folder has been chosen. It used to fall back to the site root, which accepts
        // almost nothing - dropping a file there was refused by the server and looked like the
        // drop had simply been ignored.
        canDrop: item => Boolean(path) && canDropInto(item.nodes, path) && accepts(path),
        drop: (item, monitor) => {
            // A row under the pointer has already handled it
            if (!monitor.didDrop() && path) {
                onDropInto(item, path);
            }
        },
        collect: monitor => ({
            isOverPane: monitor.isOver({shallow: true}),
            canDropOnPane: monitor.canDrop()
        })
    });

    // Results come back as a plain list; only the tree has a shape worth walking
    const fresh = isSearching ?
        (result?.nodes || []).map(node => ({node, depth: 0, hasChildren: false})) :
        flattenTree(result?.nodes);

    if (!loading && fresh.length > 0) {
        lastRows.current = fresh;
    }

    // Holding the previous rows is right while a branch opens, and wrong while searching: the old
    // rows are answers to a different question
    const rows = (fresh.length > 0 || isSearching) ? fresh : lastRows.current;

    const onKeyDown = useKeyboard({pane, rows, focusIndex, openPaths, selection, onCopy: copy, onCut: cut, onPaste: paste});
    const focused = Math.min(Math.max(focusIndex, 0), rows.length - 1);

    if (error) {
        console.error('Could not read the contents of ' + rootPath, error);
        return <Placeholder>{t('multisite-manager:label.error')}</Placeholder>;
    }

    // Opening a branch re-runs the whole query, and network-only means the result comes back empty
    // before it comes back full. Rendering that would blank the tree and - worse - claim the site
    // holds nothing. So the last rows that existed stay on screen until real ones replace them.
    // Which folders this pane is showing, so a drag can ask about all of them at once
    register(pane, rows
        .map(row => row.node)
        .filter(node => isFolder(node) || node.primaryNodeType?.name === 'jnt:virtualsite')
        .map(node => node.path));

    if (rows.length === 0) {
        if (loading) {
            return <div className={styles.contentPlaceholder}><Loader size="big"/></div>;
        }

        return (
            <Placeholder>
                {isSearching ?
                    t('multisite-manager:label.searchEmpty', {terms: searchTerms}) :
                    t('multisite-manager:label.empty')}
            </Placeholder>
        );
    }

    const selectedPaths = new Set(selection.map(node => node.path));
    const highlightedPaths = new Set(highlighted);
    const openSet = new Set(openPaths);
    const allSelected = rows.length > 0 && rows.every(row => selectedPaths.has(row.node.path));

    const toggle = node => {
        const next = selectedPaths.has(node.path) ?
            selection.filter(selected => selected.path !== node.path) :
            [...selection, toDraggable(node)];
        dispatch(msSetSelection(pane, next));
    };

    const toggleAll = () => {
        dispatch(msSetSelection(pane, allSelected ? [] : rows.map(row => toDraggable(row.node))));
    };

    return (
        <div ref={dropOnPane}
             // Focusable so it can receive keys, and given a role that says what it is
             role="grid"
             tabIndex={0}
             className={clsx(
                 styles.contentList,
                 isOverPane && canDropOnPane && styles.dropInto,
                 isOverPane && !canDropOnPane && styles.dropRefused
             )}
             data-sel-role={`multisite-content-${pane}`}
             onKeyDown={onKeyDown}
        >
            {failure && (
                <Banner variant="danger"
                        className={styles.failureBanner}
                        title={t('multisite-manager:label.transferFailed', {count: failure.count})}
                        data-sel-role="multisite-failure"
                >
                    {t('multisite-manager:label.transferFailedHint', {name: failure.name})}
                </Banner>
            )}
            {loading && (
                <div className={styles.treeLoading} data-sel-role="multisite-loading">
                    <Loader size="small"/>
                </div>
            )}
            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeadCell className={styles.checkboxCell}>
                            <Checkbox checked={allSelected} onChange={toggleAll}/>
                        </TableHeadCell>
                        <TableHeadCell className={styles.nameCell}>{t('multisite-manager:label.name')}</TableHeadCell>
                        <TableHeadCell className={styles.statusCell}>{t('multisite-manager:label.status')}</TableHeadCell>
                        <TableHeadCell>{t('multisite-manager:label.type')}</TableHeadCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => (
                        <ContentRow key={row.node.uuid || row.node.path}
                                    node={row.node}
                                    pane={pane}
                                    depth={row.depth}
                                    hasChildren={row.hasChildren}
                                    isOpen={openSet.has(row.node.path)}
                                    selection={selection}
                                    isSelected={selectedPaths.has(row.node.path)}
                                    isPasted={highlightedPaths.has(row.node.path)}
                                    isCurrent={row.node.path === path}
                                    isFocused={index === focused}
                                    accepts={accepts}
                                    language={language}
                                    uilang={uilang}
                                    onToggle={toggle}
                                    onDropInto={onDropInto}
                                    onSetCurrent={nodePath => dispatch(msSetPath(pane, nodePath))}
                                    onSetOpen={(nodePath, open) => dispatch(open ?
                                        msOpenPaths(pane, [nodePath]) :
                                        msClosePaths(pane, [nodePath]))}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

Tree.propTypes = {
    pane: PropTypes.string.isRequired,
    site: PropTypes.string.isRequired,
    mode: PropTypes.string.isRequired,
    reloadCount: PropTypes.number,
    searchTerms: PropTypes.string
};

export const PaneContent = ({pane}) => {
    const {t} = useTranslation('multisite-manager');
    const dispatch = useDispatch();
    const {site, mode, reloadCount, highlighted, searchTerms} = useSelector(state => state[REDUX_KEY][pane]);

    // Cleared here rather than in the tree, which is remounted on every reload and would restart
    // its own timer. A tint that outstayed its welcome would read as a property of the row.
    const hasHighlight = highlighted.length > 0;
    useEffect(() => {
        if (!hasHighlight) {
            return undefined;
        }

        const timer = window.setTimeout(() => dispatch(msHighlight(pane, [])), HIGHLIGHT_MS);
        return () => window.clearTimeout(timer);
    }, [dispatch, pane, hasHighlight]);

    if (!site || !mode) {
        return <Placeholder>{t('multisite-manager:label.selectSite')}</Placeholder>;
    }

    // Passed as a prop, not a key: the tree has to stay mounted so it can refetch rather than be
    // rebuilt from a cache that still holds the state before the transfer.
    // Searching swaps the query configuration, not the component: the rows, the selection, the
    // dragging and the tint all behave the same whichever produced them
    return (
        <Tree pane={pane}
              site={site}
              mode={searchTerms ? paneSearchMode(pane) : mode}
              reloadCount={reloadCount}
              searchTerms={searchTerms}
        />
    );
};

PaneContent.propTypes = {
    pane: PropTypes.string.isRequired
};

export default PaneContent;
