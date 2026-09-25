import React from 'react';
import PropTypes from 'prop-types';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {
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
import {REDUX_KEY} from './MultisiteManager.constants';
import styles from './MultisiteManager.scss';

// JContent's own values, which its query handlers compare against - not exported, so repeated
const VIEW_MODE_FLAT = 'flatList';
const VIEW_TYPE_CONTENT = 'content';
const PAGE_SIZE = 50;

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
    const {language, uilang} = useSelector(state => ({language: state.language, uilang: state.uilang}));

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

    return (
        <div className={styles.contentList} data-sel-role={`multisite-content-${pane}`}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeadCell>{t('multisite-manager:label.name')}</TableHeadCell>
                        <TableHeadCell>{t('multisite-manager:label.type')}</TableHeadCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {nodes.map(node => (
                        <TableRow key={node.uuid || node.path}>
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
    const {site, mode, path} = useSelector(state => state[REDUX_KEY][pane]);

    if (!site || !mode || !path) {
        return <Placeholder>{t('multisite-manager:label.selectFolder')}</Placeholder>;
    }

    return <ContentListing pane={pane} site={site} mode={mode} path={path}/>;
};

PaneContent.propTypes = {
    pane: PropTypes.string.isRequired
};

export default PaneContent;
