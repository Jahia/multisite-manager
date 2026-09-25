import {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {msClosePaths, msFocus, msOpenPaths, msSetPath, msSetSelection} from './MultisiteManager.redux';
import {toDraggable} from './dragAndDrop';

/**
 * Driving a pane from the keyboard.
 *
 * A transfer tool gets used heavily by a few people, and those people do not want to point at every
 * row. The gestures follow what a file manager does, because that is what this resembles:
 *
 *   up / down      move through the rows
 *   right / left   open a branch, or close it - left on a closed row steps out to its parent
 *   space          add or remove the focused row from the selection
 *   enter          make the focused folder the destination
 *   ctrl+c / x     copy or cut the selection
 *   ctrl+v         paste into this pane
 *   escape         clear the selection
 *
 * The focused row is a pane's own idea, separate from both the selection and the current folder:
 * moving through rows must not select them, or arrowing past a hundred items would copy them all.
 */
export const useKeyboard = ({pane, rows, focusIndex, openPaths, selection, onCopy, onCut, onPaste}) => {
    const dispatch = useDispatch();

    return useCallback(event => {
        if (rows.length === 0) {
            return;
        }

        const index = Math.min(Math.max(focusIndex, 0), rows.length - 1);
        const row = rows[index];
        const isOpen = openPaths.includes(row?.node?.path);

        const move = to => {
            event.preventDefault();
            dispatch(msFocus(pane, Math.min(Math.max(to, 0), rows.length - 1)));
        };

        if (event.key === 'ArrowDown') {
            return move(index + 1);
        }

        if (event.key === 'ArrowUp') {
            return move(index - 1);
        }

        if (event.key === 'ArrowRight' && row?.hasChildren && !isOpen) {
            event.preventDefault();
            return dispatch(msOpenPaths(pane, [row.node.path]));
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            if (row?.hasChildren && isOpen) {
                return dispatch(msClosePaths(pane, [row.node.path]));
            }

            // Already closed, so step out: the row above at a shallower depth is the parent
            const parent = rows.slice(0, index).reverse().findIndex(r => r.depth < row.depth);
            return parent === -1 ? undefined : move(index - parent - 1);
        }

        if (event.key === ' ') {
            event.preventDefault();
            const isSelected = selection.some(node => node.path === row.node.path);
            return dispatch(msSetSelection(pane, isSelected ?
                selection.filter(node => node.path !== row.node.path) :
                [...selection, toDraggable(row.node)]));
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            return dispatch(msSetPath(pane, row.node.path));
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            return dispatch(msSetSelection(pane, []));
        }

        // The clipboard shortcuts people already have in their fingers
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
            if (event.key === 'c') {
                event.preventDefault();
                return onCopy();
            }

            if (event.key === 'x') {
                event.preventDefault();
                return onCut();
            }

            if (event.key === 'v') {
                event.preventDefault();
                return onPaste();
            }
        }

        return undefined;
    }, [dispatch, pane, rows, focusIndex, openPaths, selection, onCopy, onCut, onPaste]);
};

export default useKeyboard;
