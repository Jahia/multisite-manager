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

/**
 * What the selected folder holds, for one pane.
 *
 * A flat list of the folder's own children rather than jContent's structured tree: the tree is
 * already on the left of this pane, and repeating it here would waste half the width that the
 * second site needs. This is the "what is in here" half of browsing.
 *
 * The query is jContent's - useLayoutQuery resolves the accordion by `mode`, which is this pane's
 * accordion key, so the query handler, type filters and sorting all come from the definition the
 * tree is already using.
 */
export const PaneContent = ({pane}) => {
    const {t} = useTranslation('multisite-manager');
    const {site, mode, path} = useSelector(state => state[REDUX_KEY][pane]);
    const {language, uilang} = useSelector(state => ({language: state.language, uilang: state.uilang}));

    const isReady = Boolean(site && mode && path);
    const options = {
        mode,
        siteKey: site,
        path,
        lang: language,
        uilang,
        pagination: {currentPage: 0, pageSize: 50},
        sort: {orderBy: 'displayName', order: 'ASC'},
        openPaths: [],
        hideRoot: true,
        tableView: {viewMode: VIEW_MODE_FLAT, viewType: VIEW_TYPE_CONTENT},
        searchPath: '',
        searchTerms: ''
    };

    // Hooks cannot be skipped, so the query always runs; when the pane has nothing selected it is
    // pointed at the site root, and the result is discarded below.
    const {result, loading, error} = useLayoutQuery(isReady ? options : {...options, mode, path: `/sites/${site || 'systemsite'}`});

    if (!isReady) {
        return (
            <div className={styles.contentPlaceholder}>
                <Typography variant="body">{t('multisite-manager:label.selectFolder')}</Typography>
            </div>
        );
    }

    if (loading) {
        return <div className={styles.contentPlaceholder}><Loader size="big"/></div>;
    }

    if (error) {
        console.error('Could not read the contents of ' + path, error);
        return (
            <div className={styles.contentPlaceholder}>
                <Typography variant="body">{t('multisite-manager:label.error')}</Typography>
            </div>
        );
    }

    const nodes = result?.nodes || [];

    if (nodes.length === 0) {
        return (
            <div className={styles.contentPlaceholder}>
                <Typography variant="body">{t('multisite-manager:label.empty')}</Typography>
            </div>
        );
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

PaneContent.propTypes = {
    pane: PropTypes.string.isRequired
};

export default PaneContent;
