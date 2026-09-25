import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {
    Checkbox,
    Loader,
    Table,
    TableBody,
    TableHead,
    TableHeadCell,
    TableRow,
    Typography
} from '@jahia/moonstone';
import {useLayoutQuery} from '@jahia/jcontent';
import {msHighlight, msSetSelection} from './MultisiteManager.redux';
import {REDUX_KEY} from './MultisiteManager.constants';
import {useDrop} from 'react-dnd';
import {canDropInto, DRAG_TYPE, toDraggable} from './dragAndDrop';
import ContentRow from './ContentRow';
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

    // Dropping anywhere in the pane that is not a folder row puts things in the folder it is
    // showing, so there is always somewhere to aim at even in a listing of leaves
    const [{isOverPane, canDropOnPane}, dropOnPane] = useDrop({
        accept: DRAG_TYPE,
        canDrop: item => canDropInto(item.nodes, path),
        drop: (item, monitor) => {
            // A folder row under the pointer has already handled it
            if (monitor.didDrop()) {
                return;
            }

            onDropInto(item, path);
        },
        collect: monitor => ({
            isOverPane: monitor.isOver({shallow: true}),
            canDropOnPane: monitor.canDrop()
        })
    });

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
            [...selection, toDraggable(node)];
        dispatch(msSetSelection(pane, next));
    };

    const toggleAll = () => {
        dispatch(msSetSelection(pane, allSelected ? [] : nodes.map(toDraggable)));
    };

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

    return (
        <div ref={dropOnPane}
             className={clsx(styles.contentList, isOverPane && canDropOnPane && styles.dropInto)}
             data-sel-role={`multisite-content-${pane}`}
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
                        <ContentRow key={node.uuid || node.path}
                                    node={node}
                                    pane={pane}
                                    selection={selection}
                                    isSelected={selectedPaths.has(node.path)}
                                    isPasted={highlightedPaths.has(node.path)}
                                    onToggle={toggle}
                                    onDropInto={onDropInto}
                        />
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
