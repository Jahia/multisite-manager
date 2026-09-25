import React, {useState} from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {useDrag, useDrop} from 'react-dnd';
import {Button, ChevronDown, ChevronRight, Checkbox, TableBodyCell, TableRow} from '@jahia/moonstone';
import {NodeIcon} from '@jahia/jcontent';
import {canDropInto, DRAG_TYPE, isFolder, toDraggable} from './dragAndDrop';
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
    node, pane, depth, hasChildren, isOpen, isSelected, isPasted, selection, onToggle, onDropInto, onSetOpen
}) => {
    const canHold = isFolder(node) || node.primaryNodeType?.name === 'jnt:virtualsite';
    const previewable = isImage(node);
    // Where the pointer is, while it is over an image row; null the rest of the time
    const [previewAt, setPreviewAt] = useState(null);

    const [{isDragging}, drag] = useDrag({
        type: DRAG_TYPE,
        // Dragging a row that is part of the selection takes the whole selection; dragging any
        // other row takes just that one, without disturbing what was selected
        item: () => ({
            fromPane: pane,
            nodes: isSelected && selection.length > 0 ? selection : [toDraggable(node)]
        }),
        collect: monitor => ({isDragging: monitor.isDragging()})
    });

    const [{isOver, canDrop}, drop] = useDrop({
        accept: DRAG_TYPE,
        canDrop: item => canHold && canDropInto(item.nodes, node.path),
        drop: item => onDropInto(item, node.path),
        collect: monitor => ({isOver: monitor.isOver({shallow: true}), canDrop: monitor.canDrop()})
    });

    return (
        <TableRow ref={element => drop(drag(element))}
                  className={clsx(
                      isPasted && styles.pastedRow,
                      isOver && canDrop && styles.dropInto,
                      isDragging && styles.dragging
                  )}
                  isHighlighted={isSelected}
                  onClick={() => onToggle(node)}
                  onMouseMove={previewable ? (event => setPreviewAt({x: event.clientX, y: event.clientY})) : undefined}
                  onMouseLeave={previewable ? (() => setPreviewAt(null)) : undefined}
        >
            <TableBodyCell className={styles.checkboxCell}>
                <Checkbox checked={isSelected} onChange={() => onToggle(node)}/>
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
                </span>
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
    isPasted: PropTypes.bool,
    selection: PropTypes.array,
    onToggle: PropTypes.func.isRequired,
    onDropInto: PropTypes.func.isRequired,
    onSetOpen: PropTypes.func.isRequired
};

export default ContentRow;
