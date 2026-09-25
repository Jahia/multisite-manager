import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {useDrag, useDrop} from 'react-dnd';
import {Button, ChevronDown, ChevronRight, Checkbox, TableBodyCell, TableRow} from '@jahia/moonstone';
import {NodeIcon} from '@jahia/jcontent';
import {canDropInto, DRAG_TYPE, isFolder, toDraggable} from './dragAndDrop';
import styles from './MultisiteManager.scss';

// Each level is indented by this much, so depth reads at a glance without a guide line
const INDENT_PX = 16;

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
        >
            <TableBodyCell className={styles.checkboxCell}>
                <Checkbox checked={isSelected} onChange={() => onToggle(node)}/>
            </TableBodyCell>
            <TableBodyCell iconStart={<NodeIcon node={node}/>}>
                <span className={styles.rowName} style={{paddingLeft: depth * INDENT_PX}}>
                    {/* The caret occupies its slot even on a leaf, so names line up within a level */}
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
                    {node.displayName || node.name}
                </span>
            </TableBodyCell>
            <TableBodyCell>{node.primaryNodeType?.displayName}</TableBodyCell>
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
