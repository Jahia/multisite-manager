import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {
    Checkbox,
    Loader,
    Table,
    TableBody,
    TableBodyCell,
    TableHead,
    TableHeadCell,
    TableRow,
    Typography
} from '@jahia/moonstone';
import {NodeIcon, useLayoutQuery} from '@jahia/jcontent';
import {msHighlight, msSetSelection} from './MultisiteManager.redux';
import {REDUX_KEY} from './MultisiteManager.constants';
import {canDropInto, isFolder, readPayload, writePayload} from './dragAndDrop';
import {useTransfer} from './useTransfer';
import styles from './MultisiteManager.scss';

// JContent's own values, which its query handlers compare against - not exported, so repeated
const VIEW_MODE_FLAT = 'flatList';
const VIEW_TYPE_CONTENT = 'content';
const PAGE_SIZE = 50;

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
 * The listing itself, mounted only once the pane has a folder to show.
 *
 * Kept as its own component on purpose: useLayoutQuery resolves the accordion with
 * `registry.get('accordionItem', mode)` and then reads `.tableConfig` off it without guarding, so
 * calling it with no mode - which is the state of a pane nobody has clicked in yet - throws. A hook
 * cannot be skipped, but a component can go unmounted.
 */
const ContentListing = ({pane, site, mode, path}) => {
    const {t} = useTranslation('multisite-manager');
    const dispatch = useDispatch();
    const {language, uilang} = useSelector(state => ({language: state.language, uilang: state.uilang}));
    const selection = useSelector(state => state[REDUX_KEY][pane].selection);
    const highlighted = useSelector(state => state[REDUX_KEY][pane].highlighted);
    const {transfer} = useTransfer();
    // Path of the folder currently under the pointer, or the pane itself for a drop anywhere else
    const [dropTarget, setDropTarget] = useState(null);

    const {result, loading, error} = useLayoutQuery({
        mode,
        siteKey: site,
        path,
        lang: language,
        uilang,
        pagination: {currentPage: 0, pageSize: PAGE_SIZE},
        sort: {orderBy: 'displayName', order: 'ASC'},
        openPaths: [],
        hideRoot: true,
        tableView: {viewMode: VIEW_MODE_FLAT, viewType: VIEW_TYPE_CONTENT},
        searchPath: '',
        searchTerms: ''
    });

    if (loading) {
        return <div className={styles.contentPlaceholder}><Loader size="big"/></div>;
    }

    if (error) {
        console.error('Could not read the contents of ' + path, error);
        return <Placeholder>{t('multisite-manager:label.error')}</Placeholder>;
    }

    const nodes = result?.nodes || [];

    if (nodes.length === 0) {
        return <Placeholder>{t('multisite-manager:label.empty')}</Placeholder>;
    }

    const selectedPaths = new Set(selection.map(node => node.path));
    const highlightedPaths = new Set(highlighted);
    const allSelected = nodes.length > 0 && nodes.every(node => selectedPaths.has(node.path));

    const toggle = node => {
        const next = selectedPaths.has(node.path) ?
            selection.filter(selected => selected.path !== node.path) :
            [...selection, {path: node.path, uuid: node.uuid, name: node.name, displayName: node.displayName}];
        dispatch(msSetSelection(pane, next));
    };

    const toggleAll = () => {
        dispatch(msSetSelection(pane, allSelected ? [] : nodes.map(node => ({
            path: node.path, uuid: node.uuid, name: node.name, displayName: node.displayName
        }))));
    };

    // Dragging a row that is part of the selection takes the whole selection; dragging any other
    // row takes just that one, without disturbing what was selected.
    const onDragStart = (event, node) => {
        const dragged = selectedPaths.has(node.path) ? selection : [{
            path: node.path, uuid: node.uuid, name: node.name, displayName: node.displayName
        }];
        writePayload(event, {fromPane: pane, nodes: dragged});
    };

    const onDrop = async (event, destination) => {
        event.preventDefault();
        event.stopPropagation();
        setDropTarget(null);

        const payload = readPayload(event);
        if (!payload || !canDropInto(payload.nodes, destination)) {
            return;
        }

        // A drag is always a move: the gesture says "put it there", not "leave a copy behind"
        await transfer({
            clipboard: {type: 'cut', nodes: payload.nodes},
            toPane: pane,
            fromPane: payload.fromPane,
            destination
        });
    };

    const onDragOver = (event, destination) => {
        // Calling preventDefault is what marks this as a drop target; the browser refuses otherwise
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        if (dropTarget !== destination) {
            setDropTarget(destination);
        }
    };

    return (
        <div className={clsx(styles.contentList, dropTarget === path && styles.dropInto)}
             data-sel-role={`multisite-content-${pane}`}
             onDragOver={event => onDragOver(event, path)}
             onDragLeave={() => setDropTarget(null)}
             onDrop={event => onDrop(event, path)}
        >
            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeadCell className={styles.checkboxCell}>
                            <Checkbox checked={allSelected} onChange={toggleAll}/>
                        </TableHeadCell>
                        <TableHeadCell>{t('multisite-manager:label.name')}</TableHeadCell>
                        <TableHeadCell>{t('multisite-manager:label.type')}</TableHeadCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {nodes.map(node => (
                        <TableRow key={node.uuid || node.path}
                                  draggable
                                  className={clsx(
                                      highlightedPaths.has(node.path) && styles.pastedRow,
                                      dropTarget === node.path && styles.dropInto
                                  )}
                                  isHighlighted={selectedPaths.has(node.path)}
                                  onClick={() => toggle(node)}
                                  onDragStart={event => onDragStart(event, node)}
                                  onDragOver={isFolder(node) ? (event => onDragOver(event, node.path)) : undefined}
                                  onDragLeave={isFolder(node) ? (() => setDropTarget(null)) : undefined}
                                  onDrop={isFolder(node) ? (event => onDrop(event, node.path)) : undefined}
                        >
                            <TableBodyCell className={styles.checkboxCell}>
                                <Checkbox checked={selectedPaths.has(node.path)}
                                          onChange={() => toggle(node)}/>
                            </TableBodyCell>
                            <TableBodyCell iconStart={<NodeIcon node={node}/>}>
                                {node.displayName || node.name}
                            </TableBodyCell>
                            <TableBodyCell>{node.primaryNodeType?.displayName}</TableBodyCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

ContentListing.propTypes = {
    pane: PropTypes.string.isRequired,
    site: PropTypes.string.isRequired,
    mode: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired
};

/**
 * What the selected folder holds, for one pane.
 *
 * A flat list of the folder's own children rather than jContent's structured tree: the tree is
 * already on the left of this pane, and repeating it here would waste half the width that the
 * second site needs.
 */
export const PaneContent = ({pane}) => {
    const {t} = useTranslation('multisite-manager');
    const dispatch = useDispatch();
    const {site, mode, path, reloadCount, highlighted} = useSelector(state => state[REDUX_KEY][pane]);

    // Cleared here rather than in the listing, which is remounted on every reload and would restart
    // its own timer. A tint that outstayed its welcome would read as a property of the row.
    const hasHighlight = highlighted.length > 0;
    useEffect(() => {
        if (!hasHighlight) {
            return undefined;
        }

        const timer = window.setTimeout(() => dispatch(msHighlight(pane, [])), HIGHLIGHT_MS);
        return () => window.clearTimeout(timer);
    }, [dispatch, pane, hasHighlight]);

    if (!site || !mode || !path) {
        return <Placeholder>{t('multisite-manager:label.selectFolder')}</Placeholder>;
    }

    // Using reloadCount as the key remounts the listing after a paste, the simplest way to make
    // it query again - jContent's refetch registry is not part of its exposed API.
    return <ContentListing key={reloadCount} pane={pane} site={site} mode={mode} path={path}/>;
};

PaneContent.propTypes = {
    pane: PropTypes.string.isRequired
};

export default PaneContent;
