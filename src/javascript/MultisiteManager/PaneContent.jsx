import React, {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {useDrop} from 'react-dnd';
import clsx from 'clsx';
import {Checkbox, Loader, Table, TableBody, TableHead, TableHeadCell, TableRow, Typography} from '@jahia/moonstone';
import {useLayoutQuery} from '@jahia/jcontent';
import {msClosePaths, msHighlight, msOpenPaths, msSetSelection} from './MultisiteManager.redux';
import {useTransfer} from './useTransfer';
import {REDUX_KEY} from './MultisiteManager.constants';
import {canDropInto, DRAG_TYPE, toDraggable} from './dragAndDrop';
import {flattenTree} from './treeRows';
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
const Tree = ({pane, site, mode}) => {
    const {t} = useTranslation('multisite-manager');
    const dispatch = useDispatch();
    const {language, uilang} = useSelector(state => ({language: state.language, uilang: state.uilang}));
    const {selection, openPaths, highlighted, path} = useSelector(state => state[REDUX_KEY][pane]);

    const rootPath = `/sites/${site}`;
    const {transfer} = useTransfer();
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

    const {result, loading, error} = useLayoutQuery({
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
        searchPath: '',
        searchTerms: ''
    });

    // Dropping on empty space below the tree puts things at the top of the site, so there is
    // always a target even when every visible row is a leaf
    const [{isOverPane, canDropOnPane}, dropOnPane] = useDrop({
        accept: DRAG_TYPE,
        canDrop: item => canDropInto(item.nodes, path || rootPath),
        drop: (item, monitor) => {
            // A row under the pointer has already handled it
            if (!monitor.didDrop()) {
                onDropInto(item, path || rootPath);
            }
        },
        collect: monitor => ({
            isOverPane: monitor.isOver({shallow: true}),
            canDropOnPane: monitor.canDrop()
        })
    });

    if (error) {
        console.error('Could not read the contents of ' + rootPath, error);
        return <Placeholder>{t('multisite-manager:label.error')}</Placeholder>;
    }

    // Opening a branch re-runs the whole query, and network-only means the result comes back empty
    // before it comes back full. Rendering that would blank the tree and - worse - claim the site
    // holds nothing. So the last rows that existed stay on screen until real ones replace them.
    const fresh = flattenTree(result?.nodes);
    if (!loading && fresh.length > 0) {
        lastRows.current = fresh;
    }

    const rows = fresh.length > 0 ? fresh : lastRows.current;

    if (rows.length === 0) {
        // Nothing to keep and nothing arrived: either the first load, or a site that really is bare
        return loading ?
            <div className={styles.contentPlaceholder}><Loader size="big"/></div> :
            <Placeholder>{t('multisite-manager:label.empty')}</Placeholder>;
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
             className={clsx(styles.contentList, isOverPane && canDropOnPane && styles.dropInto)}
             data-sel-role={`multisite-content-${pane}`}
        >
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
                        <TableHeadCell>{t('multisite-manager:label.type')}</TableHeadCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map(row => (
                        <ContentRow key={row.node.uuid || row.node.path}
                                    node={row.node}
                                    pane={pane}
                                    depth={row.depth}
                                    hasChildren={row.hasChildren}
                                    isOpen={openSet.has(row.node.path)}
                                    selection={selection}
                                    isSelected={selectedPaths.has(row.node.path)}
                                    isPasted={highlightedPaths.has(row.node.path)}
                                    onToggle={toggle}
                                    onDropInto={onDropInto}
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
    mode: PropTypes.string.isRequired
};

export const PaneContent = ({pane}) => {
    const {t} = useTranslation('multisite-manager');
    const dispatch = useDispatch();
    const {site, mode, reloadCount, highlighted} = useSelector(state => state[REDUX_KEY][pane]);

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

    // Using reloadCount as the key remounts the tree after a transfer, the simplest way to make it
    // query again - jContent's refetch registry is not part of its exposed API.
    return <Tree key={reloadCount} pane={pane} site={site} mode={mode}/>;
};

PaneContent.propTypes = {
    pane: PropTypes.string.isRequired
};

export default PaneContent;
