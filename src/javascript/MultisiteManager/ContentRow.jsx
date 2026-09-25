import React, {useState} from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {useTranslation} from 'react-i18next';
import {useDrag, useDrop} from 'react-dnd';
import {Button, ChevronDown, ChevronRight, Checkbox, TableBodyCell, TableRow} from '@jahia/moonstone';
import {ContentStatuses, NodeIcon} from '@jahia/jcontent';
import {canDropInto, DRAG_TYPE, isFolder, toDraggable} from './dragAndDrop';
import {useDropCheck} from './DropCheck.context';
import {isImage} from './fileUtils';
import ThumbnailPreview from './ThumbnailPreview';
import styles from './MultisiteManager.scss';

// Each level is indented by this much, so depth reads at a glance without a guide line
const INDENT_PX = 24;

/**
 * One row of the tree, which is something to pick up, somewhere to put things if it can hold them,
 * and - if it has children - something to open.
 *
 * Its own component because a row needs hooks, and hooks cannot be called from inside a map.
 */
export const ContentRow = ({
    node, pane, depth, hasChildren, isOpen, isSelected, isPasted, isCurrent, isFocused, selection,
    accepts, language, uilang, onToggle, onDropInto, onSetOpen, onSetCurrent
}) => {
    const canHold = isFolder(node) || node.primaryNodeType?.name === 'jnt:virtualsite';
    // Present only on reference nodes; everything else comes back without the property
    const referenced = node.referenced?.refNode;
    // Empty on anything that is not translated, such as a folder
    const languages = node.translationLanguages || [];
    const previewable = isImage(node);
    // Where the pointer is, while it is over an image row; null the rest of the time
    const [previewAt, setPreviewAt] = useState(null);

    const {t} = useTranslation('multisite-manager');

    const {prime, clear} = useDropCheck();

    const [{isDragging}, drag] = useDrag({
        type: DRAG_TYPE,
        // Dragging a row that is part of the selection takes the whole selection; dragging any
        // other row takes just that one, without disturbing what was selected
        item: () => {
            const nodes = isSelected && selection.length > 0 ? selection : [toDraggable(node)];
            // One query, now, for every folder on screen - so the rest of the drag needs none
            prime(nodes);
            return {fromPane: pane, nodes};
        },
        end: () => clear(),
        collect: monitor => ({isDragging: monitor.isDragging()})
    });

    const [{isOver, canDrop}, drop] = useDrop({
        accept: DRAG_TYPE,
        canDrop: item => canHold && canDropInto(item.nodes, node.path) && accepts(node.path),
        drop: item => onDropInto(item, node.path),
        collect: monitor => ({isOver: monitor.isOver({shallow: true}), canDrop: monitor.canDrop()})
    });

    return (
        <TableRow ref={element => drop(drag(element))}
                  className={clsx(
                      isPasted && styles.pastedRow,
                      isOver && canDrop && styles.dropInto,
                      // Refused, and said so while the reader is still holding it
                      isOver && !canDrop && styles.dropRefused,
                      isDragging && styles.dragging,
                      isFocused && styles.focused
                  )}
                  isSelected={isCurrent}
                  isHighlighted={isSelected}
                  onClick={() => canHold && onSetCurrent(node.path)}
                  onMouseMove={previewable ? (event => setPreviewAt({x: event.clientX, y: event.clientY})) : undefined}
                  onMouseLeave={previewable ? (() => setPreviewAt(null)) : undefined}
        >
            <TableBodyCell className={styles.checkboxCell}>
                {/* Ticking a row is choosing what to move; clicking it is choosing where to put
                    things. Two different questions, so two different gestures. */}
                <Checkbox checked={isSelected}
                          onClick={event => event.stopPropagation()}
                          onChange={() => onToggle(node)}/>
            </TableBodyCell>
            <TableBodyCell className={styles.nameCell}>
                {/*
                  * The icon is inside the indented wrapper rather than passed as iconStart, which
                  * TableBodyCell renders outside it: that left every icon in one column and shifted
                  * only the text, so a nested tree read as a flat list.
                  */}
                <span className={styles.rowName} style={{paddingLeft: depth * INDENT_PX}}>
                    {/* The caret keeps its slot even on a leaf, so names line up within a level */}
                    <span className={styles.caret}>
                        {hasChildren && (
                            <Button size="small"
                                    variant="ghost"
                                    icon={isOpen ? <ChevronDown/> : <ChevronRight/>}
                                    data-sel-role="multisite-expand"
                                    onClick={event => {
                                        // Opening a branch is not selecting it
                                        event.stopPropagation();
                                        onSetOpen(node.path, !isOpen);
                                    }}
                            />
                        )}
                    </span>
                    <NodeIcon node={node}/>
                    {node.displayName || node.name}
                    {languages.length > 0 && (
                        <span className={styles.languages}
                              title={t('multisite-manager:label.translatedIn', {languages: languages.join(', ')})}
                        >
                            {languages.join(' ')}
                        </span>
                    )}
                    {referenced && (
                        // Where the referenced thing actually lives. The name a reference carries
                        // says nothing about that, and in a tool about content from elsewhere it is
                        // the fact worth having.
                        <span className={styles.referenceSource} title={referenced.path}>
                            ({referenced.site?.displayName || referenced.site?.sitekey || t('multisite-manager:label.unknownSite')})
                        </span>
                    )}
                </span>
            </TableBodyCell>
            <TableBodyCell className={styles.statusCell}>
                {/*
                  * jContent's own component, given only the statuses that bear on a transfer: what
                  * is published where, and what is locked or on its way out. The data was already
                  * on every row - aggregatedPublicationInfo comes with jContent's node fields - so
                  * this costs nothing to ask for.
                  */}
                <ContentStatuses node={node}
                                 language={language}
                                 uilang={uilang}
                                 hasLabel={false}
                                 renderedStatuses={['published', 'modified', 'notPublished', 'locked', 'markedForDeletion']}
                />
            </TableBodyCell>
            <TableBodyCell>{node.primaryNodeType?.displayName}</TableBodyCell>
            {previewable && <ThumbnailPreview node={node} at={previewAt}/>}
        </TableRow>
    );
};

ContentRow.propTypes = {
    node: PropTypes.object.isRequired,
    pane: PropTypes.string.isRequired,
    depth: PropTypes.number,
    hasChildren: PropTypes.bool,
    isOpen: PropTypes.bool,
    isSelected: PropTypes.bool,
    accepts: PropTypes.func,
    language: PropTypes.string,
    uilang: PropTypes.string,
    isPasted: PropTypes.bool,
    isCurrent: PropTypes.bool,
    isFocused: PropTypes.bool,
    selection: PropTypes.array,
    onToggle: PropTypes.func.isRequired,
    onDropInto: PropTypes.func.isRequired,
    onSetOpen: PropTypes.func.isRequired,
    onSetCurrent: PropTypes.func.isRequired
};

export default ContentRow;
