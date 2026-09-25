import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {useDrag, useDrop} from 'react-dnd';
import {Checkbox, TableBodyCell, TableRow} from '@jahia/moonstone';
import {NodeIcon} from '@jahia/jcontent';
import {canDropInto, DRAG_TYPE, isFolder, toDraggable} from './dragAndDrop';
import styles from './MultisiteManager.scss';

/**
 * One row, which is both something to pick up and - if it is a folder - somewhere to put things.
 *
 * Its own component because a row needs hooks, and hooks cannot be called from inside a map.
 */
export const ContentRow = ({node, pane, isSelected, isPasted, selection, onToggle, onDropInto}) => {
    const draggable = isFolder(node);

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
        canDrop: item => draggable && canDropInto(item.nodes, node.path),
        drop: item => onDropInto(item, node.path),
        collect: monitor => ({isOver: monitor.isOver(), canDrop: monitor.canDrop()})
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
                {node.displayName || node.name}
            </TableBodyCell>
            <TableBodyCell>{node.primaryNodeType?.displayName}</TableBodyCell>
        </TableRow>
    );
};

ContentRow.propTypes = {
    node: PropTypes.object.isRequired,
    pane: PropTypes.string.isRequired,
    isSelected: PropTypes.bool,
    isPasted: PropTypes.bool,
    selection: PropTypes.array,
    onToggle: PropTypes.func.isRequired,
    onDropInto: PropTypes.func.isRequired
};

export default ContentRow;
